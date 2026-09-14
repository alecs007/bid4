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

@Service
public class SaleDocuments {
  private final OrderService orders;
  private final DocumentService documents;
  private final UserAccountRepository users;
  private final ObjectProvider<DocumentRenderer> renderers;

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

  @Transactional(readOnly = true)
  public List<DocumentResponse> listFor(UUID orderId, Viewer viewer) {
    Order order = orders.get(orderId, viewer);
    boolean isSeller = viewer.is(order.getSellerId()) || viewer.staff();

    return documents
        .forOrder(
            orderId,
            userId ->
                users.findById(userId).map(account -> account.getDisplayName()).orElse("bid4"))
        .stream()
        .map(
            row ->
                row.kind().equals(DocumentKind.SHIPPING_LABEL.name()) ? label(row, isSeller) : row)
        .toList();
  }

  private static DocumentResponse label(DocumentResponse row, boolean isSeller) {
    return new DocumentResponse(
        row.kind(), row.number(), row.issuedToName(), row.amount(), isSeller, row.issuedAt());
  }

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
