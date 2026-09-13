package ro.bid4.backend.billing.service;

import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.billing.api.dto.DocumentResponse;
import ro.bid4.backend.billing.domain.DocumentKind;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.common.error.ErrorCode;
import ro.bid4.backend.common.web.Viewer;
import ro.bid4.backend.identity.repo.UserAccountRepository;
import ro.bid4.backend.orders.domain.Order;
import ro.bid4.backend.orders.service.OrderService;
import ro.bid4.backend.orders.service.Terms;
import ro.bid4.backend.shipping.service.LabelDocument;

/**
 * The paperwork of one sale, for whoever is entitled to it.
 *
 * <p>Sits between the document store and the web layer so the controller touches neither a
 * repository nor an entity. It is also where "entitled to it" is decided, and that is not the same
 * question as "party to the sale": a seller has no business fetching the buyer's invoice, and a
 * buyer none fetching the courier's label.
 */
@Service
public class SaleDocuments {

  private final OrderService orders;
  private final DocumentService documents;
  private final UserAccountRepository users;
  private final ObjectProvider<DocumentRenderer> renderers;

  /**
   * The renderer is optional on purpose.
   *
   * <p>There is none today. Asked for through a provider rather than injected, so adding one is a
   * matter of declaring a bean and no wiring here changes — and until then every fiscal document is
   * still listed and numbered, and honestly unavailable.
   */
  public SaleDocuments(
      OrderService orders,
      DocumentService documents,
      UserAccountRepository users,
      ObjectProvider<DocumentRenderer> renderers) {
    this.orders = orders;
    this.documents = documents;
    this.users = users;
    this.renderers = renderers;
  }

  /** Everything on the file, including what is promised and not yet rendered. */
  @Transactional(readOnly = true)
  public List<DocumentResponse> listFor(UUID orderId, Viewer viewer) {
    orders.get(orderId, viewer);
    return documents.forOrder(
        orderId,
        userId -> users.findById(userId).map(account -> account.getDisplayName()).orElse("bid4"));
  }

  /**
   * The bytes, or a refusal that says why.
   *
   * <p>The label is fetched from the courier rather than from storage, because the courier is the
   * authority on it and a seller who lost it needs the current one. Everything else is a rendered
   * document, and until a renderer exists this answers 409 rather than an empty PDF — a document
   * that downloads and says nothing is worse than one that is honestly not ready.
   */
  @Transactional(readOnly = true)
  public Download download(UUID orderId, String kindName, Viewer viewer) {
    Order order = orders.get(orderId, viewer);
    DocumentKind kind = DocumentService.kindOf(kindName);

    if (kind == DocumentKind.SHIPPING_LABEL) {
      LabelDocument label = orders.labelFor(orderId, viewer);
      return new Download(label.contentType(), label.filename(), label.bytes());
    }

    if (kind == DocumentKind.PAYOUT_STATEMENT) {
      if (!viewer.is(order.getSellerId()) && !viewer.staff()) {
        throw ApiException.forbidden("Documentul este disponibil vânzătorului.");
      }
    } else if (!viewer.is(order.getBuyerId()) && !viewer.staff()) {
      // The fiscal documents of a sale are addressed to the buyer. The seller's
      // own paperwork is the payout statement, handled above.
      throw ApiException.forbidden("Documentul este disponibil cumpărătorului.");
    }

    DocumentRenderer renderer = renderers.getIfAvailable();
    if (renderer == null) {
      throw new ApiException(
          ErrorCode.CONFLICT, "Documentul se emite după integrarea serviciului de facturare.");
    }

    DocumentRenderer.Rendered rendered = renderer.render(kind, factsOf(order, kind));
    return new Download(
        rendered.contentType(), "%s.pdf".formatted(kind.name().toLowerCase()), rendered.bytes());
  }

  /**
   * What the document states, read once and handed over.
   *
   * <p>The number comes from the row rather than being computed here, so reprinting a document
   * years later reprints the number it was issued under.
   */
  private DocumentFacts factsOf(Order order, DocumentKind kind) {
    return new DocumentFacts(
        order.getReference(),
        documents.numberOf(order.getId(), kind).orElse(null),
        users.findById(order.getBuyerId()).map(account -> account.getDisplayName()).orElse(""),
        null,
        "",
        "",
        order.getFinalPrice(),
        order.getPlatformTax(),
        order.getShipping(),
        order.getTotalPaid(),
        order.getDonationAmount(),
        order.getDonationPercent(),
        order.getSellerShare(),
        Terms.CURRENT_VERSION);
  }

  public record Download(String contentType, String filename, byte[] bytes) {}
}
