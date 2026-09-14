package ro.bid4.backend.billing.service;

import ro.bid4.backend.billing.domain.DocumentKind;

public interface DocumentRenderer {
  Rendered render(DocumentKind kind, DocumentFacts facts);

  record Rendered(String contentType, byte[] bytes) {}
}
