package ro.bid4.backend.inbox.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.catalog.domain.Auction;
import ro.bid4.backend.catalog.domain.AuctionStatus;
import ro.bid4.backend.catalog.repo.AuctionRepository;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.common.error.ErrorCode;
import ro.bid4.backend.common.web.Viewer;
import ro.bid4.backend.inbox.api.dto.ConversationSummary;
import ro.bid4.backend.inbox.api.dto.CursorPage;
import ro.bid4.backend.inbox.api.dto.OpenThreadRequest;
import ro.bid4.backend.inbox.api.dto.SendMessageRequest;
import ro.bid4.backend.inbox.api.dto.ThreadItemResponse;
import ro.bid4.backend.inbox.api.dto.ThreadResponse;
import ro.bid4.backend.inbox.api.dto.UnreadCounts;
import ro.bid4.backend.inbox.domain.Conversation;
import ro.bid4.backend.inbox.domain.ConversationParticipant;
import ro.bid4.backend.inbox.domain.ThreadItem;
import ro.bid4.backend.inbox.repo.ConversationParticipantRepository;
import ro.bid4.backend.inbox.repo.ConversationRepository;
import ro.bid4.backend.inbox.repo.NotificationRepository;
import ro.bid4.backend.inbox.repo.ThreadItemRepository;
import ro.bid4.backend.storage.domain.StoredFile;
import ro.bid4.backend.storage.domain.Visibility;
import ro.bid4.backend.storage.repo.StoredFileRepository;

@Service
public class InboxService {
  private static final int THREAD_PAGE = 30;

  private static final int LIST_PAGE = 20;

  private static final int MAX_ITEMS_PER_MINUTE = 20;

  private final ConversationRepository conversations;
  private final ConversationParticipantRepository participants;
  private final ThreadItemRepository items;
  private final NotificationRepository notifications;
  private final AuctionRepository auctions;
  private final StoredFileRepository files;
  private final InboxMapper mapper;
  private final InboxEvents events;
  private final ThreadEvents threads;
  private final Welcome welcome;

  public InboxService(
      ConversationRepository conversations,
      ConversationParticipantRepository participants,
      ThreadItemRepository items,
      NotificationRepository notifications,
      AuctionRepository auctions,
      StoredFileRepository files,
      InboxMapper mapper,
      InboxEvents events,
      ThreadEvents threads,
      Welcome welcome) {
    this.conversations = conversations;
    this.participants = participants;
    this.items = items;
    this.notifications = notifications;
    this.auctions = auctions;
    this.files = files;
    this.mapper = mapper;
    this.events = events;
    this.threads = threads;
    this.welcome = welcome;
  }

  @Transactional
  public CursorPage<ConversationSummary> list(String cursor, boolean archived, Viewer viewer) {
    UUID me = required(viewer);
    if (cursor == null && !archived) {
      welcome.ensureFor(me);
    }

    Instant before = Cursors.instantOf(cursor);
    List<Conversation> page =
        before == null
            ? conversations.firstPageFor(me, archived, Limit.of(LIST_PAGE + 1))
            : conversations.pageForBefore(
                me, archived, before, Cursors.idOf(cursor), Limit.of(LIST_PAGE + 1));

    boolean more = page.size() > LIST_PAGE;
    List<Conversation> listings = more ? page.subList(0, LIST_PAGE) : page;

    List<Conversation> visible = new ArrayList<>(listings);
    if (before == null) {
      conversations
          .findSupportThread(me)
          .filter(
              support ->
                  participants
                      .findMembership(support.getId(), me)
                      .map(seat -> seat.isArchived() == archived)
                      .orElse(false))
          .ifPresent(support -> visible.add(0, support));
    }

    if (visible.isEmpty()) {
      return CursorPage.of(List.of(), null);
    }

    List<UUID> ids = visible.stream().map(Conversation::getId).toList();
    Map<UUID, ConversationParticipant> membership =
        participants.findMemberships(ids, me).stream()
            .collect(Collectors.toMap(ConversationParticipant::getConversationId, row -> row));

    return CursorPage.of(
        mapper.toSummaries(visible, membership, newestItems(ids), me),
        more ? cursorOf(listings.getLast()) : null);
  }

  @Transactional(readOnly = true)
  public ThreadResponse thread(UUID conversationId, Viewer viewer) {
    UUID me = required(viewer);
    ConversationParticipant membership = membershipIn(conversationId, me);
    Conversation conversation = load(conversationId);

    CursorPage<ThreadItemResponse> page = itemsPage(conversationId, null, me);
    Auction listing =
        conversation.getListingId() == null
            ? null
            : auctions.findById(conversation.getListingId()).orElse(null);

    return new ThreadResponse(
        mapper.toSummary(conversation, membership, null, listing, otherParty(conversation, me), me),
        page.items(),
        page.nextCursor());
  }

  @Transactional(readOnly = true)
  public CursorPage<ThreadItemResponse> items(UUID conversationId, String cursor, Viewer viewer) {
    UUID me = required(viewer);
    membershipIn(conversationId, me);
    return itemsPage(conversationId, cursor, me);
  }

  @Transactional(readOnly = true)
  public UnreadCounts unread(Viewer viewer) {
    UUID me = required(viewer);
    return new UnreadCounts(
        participants.countUnreadThreads(me), notifications.countByUserIdAndReadAtIsNull(me));
  }

  @Transactional
  public ThreadResponse open(OpenThreadRequest request, Viewer viewer) {
    UUID me = required(viewer);

    Auction listing =
        auctions
            .findById(request.listingId())
            .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Anunțul nu a fost găsit."));

    if (listing.getSellerId().equals(me)) {
      throw new ApiException(
          ErrorCode.VALIDATION_FAILED, "Nu poți deschide o conversație la propriul anunț.");
    }
    if (listing.getStatus() == AuctionStatus.DRAFT
        || listing.getStatus() == AuctionStatus.PENDING_REVIEW) {
      throw new ApiException(ErrorCode.NOT_FOUND, "Anunțul nu a fost găsit.");
    }

    boolean saying = request.message() != null && !request.message().isBlank();
    Optional<Conversation> existing = conversations.findListingThread(listing.getId(), me);
    if (existing.isEmpty() && !saying) {
      throw new ApiException(ErrorCode.NOT_FOUND, "Conversația nu există încă.");
    }

    Conversation conversation =
        existing.orElseGet(() -> threads.ensureThread(listing.getId(), me, listing.getSellerId()));
    if (saying) {
      write(conversation, me, request.message(), List.of());
    }

    return thread(conversation.getId(), viewer);
  }

  @Transactional(readOnly = true)
  public ThreadResponse forListing(UUID listingId, Viewer viewer) {
    UUID me = required(viewer);
    Conversation conversation =
        conversations
            .findListingThread(listingId, me)
            .orElseThrow(
                () -> new ApiException(ErrorCode.NOT_FOUND, "Conversația nu există încă."));
    return thread(conversation.getId(), viewer);
  }

  @Transactional
  public ThreadItemResponse send(UUID conversationId, SendMessageRequest request, Viewer viewer) {
    UUID me = required(viewer);
    membershipIn(conversationId, me);

    String body = request.body() == null ? "" : request.body().strip();
    List<UUID> imageRefs = request.imageRefs() == null ? List.of() : request.imageRefs();
    if (body.isEmpty() && imageRefs.isEmpty()) {
      throw new ApiException(ErrorCode.VALIDATION_FAILED, "Mesajul este gol.");
    }

    Conversation conversation = load(conversationId);
    guardBurst(conversationId, me);

    return mapper.toItem(write(conversation, me, body, claim(imageRefs, me)), me);
  }

  @Transactional
  public void markRead(UUID conversationId, Viewer viewer) {
    UUID me = required(viewer);
    membershipIn(conversationId, me);
    participants.markRead(conversationId, me, Instant.now());
    events.unreadChanged(me);
  }

  @Transactional
  public void setArchived(UUID conversationId, boolean archived, Viewer viewer) {
    UUID me = required(viewer);
    ConversationParticipant membership = membershipIn(conversationId, me);
    membership.setArchived(archived);
    participants.save(membership);
  }

  @Transactional
  public void setMuted(UUID conversationId, boolean muted, Viewer viewer) {
    UUID me = required(viewer);
    ConversationParticipant membership = membershipIn(conversationId, me);
    membership.setMuted(muted);
    participants.save(membership);
  }

  private ConversationParticipant membershipIn(UUID conversationId, UUID userId) {
    return participants
        .findMembership(conversationId, userId)
        .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Conversația nu a fost găsită."));
  }

  private ThreadItem write(
      Conversation conversation, UUID senderId, String body, List<UUID> imageRefs) {
    ThreadItem item =
        imageRefs.isEmpty()
            ? ThreadItem.text(conversation.getId(), senderId, body)
            : ThreadItem.image(conversation.getId(), senderId, imageRefs);

    if (!imageRefs.isEmpty() && !body.isEmpty()) {
      item.setBody(body);
    }
    item.setFlaggedReason(OffPlatformGuard.inspect(body));

    ThreadItem saved = items.save(item);
    conversations.touch(conversation.getId(), saved.getCreatedAt());
    participants.markUnreadForOthers(conversation.getId(), senderId);

    for (ConversationParticipant party : participants.findAllIn(conversation.getId())) {
      if (!party.getUserId().equals(senderId)) {
        events.itemArrived(party.getUserId(), conversation.getId(), saved.getId());
      }
    }
    return saved;
  }

  private List<UUID> claim(List<UUID> refs, UUID senderId) {
    if (refs.isEmpty()) {
      return List.of();
    }
    Set<UUID> ids = new LinkedHashSet<>(refs);
    List<StoredFile> owned =
        files.findByIdInAndOwnerIdAndVisibility(ids, senderId, Visibility.PUBLIC);
    if (owned.size() != ids.size()) {
      throw new ApiException(
          ErrorCode.VALIDATION_FAILED, "Imaginile nu au putut fi găsite. Încarcă-le din nou.");
    }
    return List.copyOf(ids);
  }

  private void guardBurst(UUID conversationId, UUID senderId) {
    long recent =
        items.countByConversationIdAndSenderIdAndCreatedAtAfter(
            conversationId, senderId, Instant.now().minusSeconds(60));
    if (recent >= MAX_ITEMS_PER_MINUTE) {
      throw new ApiException(
          ErrorCode.RATE_LIMITED, "Prea multe mesaje trimise. Așteaptă câteva secunde.");
    }
  }

  private CursorPage<ThreadItemResponse> itemsPage(
      UUID conversationId, String cursor, UUID viewerId) {
    Instant before = Cursors.instantOf(cursor);
    List<ThreadItem> page =
        before == null
            ? items.firstPage(conversationId, Limit.of(THREAD_PAGE + 1))
            : items.pageBefore(
                conversationId, before, Cursors.idOf(cursor), Limit.of(THREAD_PAGE + 1));

    boolean more = page.size() > THREAD_PAGE;
    List<ThreadItem> visible = more ? page.subList(0, THREAD_PAGE) : page;

    return CursorPage.of(
        mapper.toItems(visible, viewerId),
        more && !visible.isEmpty()
            ? Cursors.encode(visible.getLast().getCreatedAt(), visible.getLast().getId())
            : null);
  }

  private Map<UUID, ThreadItem> newestItems(List<UUID> conversationIds) {
    if (conversationIds.isEmpty()) {
      return new HashMap<>();
    }
    return items.findNewestPerConversation(conversationIds.toArray(UUID[]::new)).stream()
        .collect(Collectors.toMap(ThreadItem::getConversationId, Function.identity()));
  }

  private ro.bid4.backend.identity.api.dto.PublicUserResponse otherParty(
      Conversation conversation, UUID viewerId) {
    if (conversation.getSellerId() == null) {
      return null;
    }
    UUID otherId =
        viewerId.equals(conversation.getBuyerId())
            ? conversation.getSellerId()
            : conversation.getBuyerId();
    return Optional.ofNullable(mapper.publicUser(otherId)).orElse(null);
  }

  private Conversation load(UUID conversationId) {
    return conversations
        .findById(conversationId)
        .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Conversația nu a fost găsită."));
  }

  private static String cursorOf(Conversation last) {
    return Cursors.encode(last.getLastItemAt(), last.getId());
  }

  private static UUID required(Viewer viewer) {
    if (viewer.isAnonymous()) {
      throw new ApiException(ErrorCode.UNAUTHENTICATED, "Autentifică-te pentru a continua.");
    }
    return viewer.id();
  }
}
