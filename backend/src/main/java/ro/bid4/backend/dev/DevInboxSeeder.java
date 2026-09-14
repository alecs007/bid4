package ro.bid4.backend.dev;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.catalog.domain.Auction;
import ro.bid4.backend.catalog.domain.AuctionStatus;
import ro.bid4.backend.catalog.repo.AuctionRepository;
import ro.bid4.backend.identity.domain.UserAccount;
import ro.bid4.backend.identity.repo.UserAccountRepository;
import ro.bid4.backend.inbox.domain.Conversation;
import ro.bid4.backend.inbox.domain.ConversationKind;
import ro.bid4.backend.inbox.domain.ConversationParticipant;
import ro.bid4.backend.inbox.domain.ParticipantRole;
import ro.bid4.backend.inbox.domain.ThreadItem;
import ro.bid4.backend.inbox.repo.ConversationParticipantRepository;
import ro.bid4.backend.inbox.repo.ConversationRepository;
import ro.bid4.backend.inbox.repo.ThreadItemRepository;

@Component
@Order(3)
@ConditionalOnProperty(name = "bid4.dev.seed", havingValue = "true")
public class DevInboxSeeder implements ApplicationRunner {
  private static final Logger log = LoggerFactory.getLogger(DevInboxSeeder.class);

  private record Exchange(boolean buyerFirst, String... lines) {}

  private static final List<Exchange> AS_BUYER =
      List.of(
          new Exchange(
              true,
              "Bună! Mai este disponibil?",
              "Salut! Da, este. Îl pot trimite chiar mâine dacă te hotărăști.",
              "Super. Se vede vreo zgârietură pe spate?",
              "Doar una foarte mică, lângă colț. Am pus o poză exact cu ea în anunț."),
          new Exchange(
              true,
              "Bună ziua! Îl mai țineți câteva zile? Aș vrea să licitez sâmbătă.",
              "Sigur, nu mă grăbesc. Anunțul stă până găsesc cumpărătorul potrivit.",
              "Mulțumesc mult, mă întorc atunci."),
          new Exchange(
              true,
              "Salut! Cât cântărește cu tot cu cutie? Vreau să știu cât iese livrarea.",
              "Cam 1,2 kg. Costul apare oricum în anunț înainte să licitezi, e deja calculat."));

  private static final List<Exchange> AS_SELLER =
      List.of(
          new Exchange(
              true,
              "Bună! E în stare bună? Se vede ceva uzură?",
              "Bună! E folosit cu grijă, fără defecte. Pozele sunt făcute azi, la lumină naturală.",
              "Perfect, mulțumesc!"),
          new Exchange(
              true,
              "Salut, dă-mi te rog un număr de WhatsApp să vorbim mai repede, 0722 333 444.",
              "Prefer să rămânem aici — plata prin bid4 e protejată, iar donația pleacă doar de pe"
                  + " platformă. Te ajut cu orice întrebare chiar în conversație.",
              "Am înțeles, are sens. Atunci licitez aici."),
          new Exchange(
              true,
              "Bună! Dacă licitez azi, când l-ai putea trimite?",
              "În aceeași zi în care se face plata, cel târziu a doua zi dimineața."));

  private final UserAccountRepository users;
  private final AuctionRepository auctions;
  private final ConversationRepository conversations;
  private final ConversationParticipantRepository participants;
  private final ThreadItemRepository items;

  public DevInboxSeeder(
      UserAccountRepository users,
      AuctionRepository auctions,
      ConversationRepository conversations,
      ConversationParticipantRepository participants,
      ThreadItemRepository items) {
    this.users = users;
    this.auctions = auctions;
    this.conversations = conversations;
    this.participants = participants;
    this.items = items;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    if (conversations.countByKind(ConversationKind.LISTING) > 0) {
      log.info("Development inbox seed skipped: conversations already exist");
      return;
    }

    Optional<UserAccount> maria = users.findByEmail("maria@bid4.ro");
    if (maria.isEmpty()) {
      log.info("Development inbox seed skipped: the demo accounts are not there");
      return;
    }
    UUID mariaId = maria.get().getId();

    int written = 0;
    written += asBuyer(mariaId);
    written += asSeller(mariaId);

    log.info("Development inbox seed: {} conversations for maria@bid4.ro", written);
  }

  private int asBuyer(UUID mariaId) {
    List<Auction> theirs =
        auctions.findAll().stream()
            .filter(auction -> !auction.getSellerId().equals(mariaId))
            .filter(auction -> auction.getStatus() == AuctionStatus.LIVE)
            .limit(AS_BUYER.size())
            .toList();

    int written = 0;
    for (int index = 0; index < theirs.size(); index++) {
      Auction listing = theirs.get(index);
      write(listing, mariaId, listing.getSellerId(), AS_BUYER.get(index), index);
      written++;
    }
    return written;
  }

  private int asSeller(UUID mariaId) {
    List<Auction> hers =
        auctions.findAll().stream()
            .filter(auction -> auction.getSellerId().equals(mariaId))
            .limit(AS_SELLER.size())
            .toList();

    List<UserAccount> askers =
        users.findAll().stream().filter(user -> !user.getId().equals(mariaId)).limit(3).toList();
    if (askers.isEmpty()) {
      return 0;
    }

    int written = 0;
    for (int index = 0; index < hers.size(); index++) {
      Auction listing = hers.get(index);
      UUID buyer = askers.get(index % askers.size()).getId();
      write(listing, buyer, mariaId, AS_SELLER.get(index), AS_BUYER.size() + index);
      written++;
    }
    return written;
  }

  private void write(Auction listing, UUID buyerId, UUID sellerId, Exchange exchange, int age) {
    Instant opened = Instant.now().minus(Duration.ofHours(3L + age * 9L));

    Conversation conversation = new Conversation();
    conversation.setKind(ConversationKind.LISTING);
    conversation.setListingId(listing.getId());
    conversation.setBuyerId(buyerId);
    conversation.setSellerId(sellerId);
    conversation.setCreatedAt(opened);
    Conversation saved = conversations.save(conversation);

    String[] lines = exchange.lines();
    boolean fromBuyer = exchange.buyerFirst();
    Instant at = opened;

    for (String line : lines) {
      ThreadItem item = ThreadItem.text(saved.getId(), fromBuyer ? buyerId : sellerId, line);
      item.setCreatedAt(at);
      items.save(item);

      at = at.plus(Duration.ofMinutes(4));
      fromBuyer = !fromBuyer;
    }

    Instant lastAt = at.minus(Duration.ofMinutes(4));
    conversation.setLastItemAt(lastAt);

    boolean lastFromBuyer = !fromBuyer;
    participants.save(seat(saved.getId(), buyerId, ParticipantRole.BUYER, lastFromBuyer ? 0 : 1));
    participants.save(seat(saved.getId(), sellerId, ParticipantRole.SELLER, lastFromBuyer ? 1 : 0));
  }

  private ConversationParticipant seat(
      UUID conversationId, UUID userId, ParticipantRole role, int unread) {
    ConversationParticipant participant = new ConversationParticipant(conversationId, userId, role);
    participant.setUnreadCount(unread);
    return participant;
  }
}
