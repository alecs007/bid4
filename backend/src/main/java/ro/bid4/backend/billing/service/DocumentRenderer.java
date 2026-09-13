package ro.bid4.backend.billing.service;

import ro.bid4.backend.billing.domain.DocumentKind;

/**
 * Turns a sale into the bytes of a document.
 *
 * <p>The seam an invoicing provider goes behind. Romanian e-invoicing (RO e-Factura) is a
 * submission to ANAF in a prescribed XML, not a PDF somebody designed, so the interface answers
 * bytes plus a content type rather than promising a PDF — an implementation that submits and
 * returns the signed response fits without changing the caller.
 *
 * <p>What must not move behind this seam is the numbering. A series is a legal sequence with no
 * gaps; asking a provider for the next number means the sequence lives somewhere this application
 * cannot audit. {@code DocumentNumbers} keeps it here.
 */
public interface DocumentRenderer {

  /**
   * @param facts everything the document states, already computed
   * @return the rendered document, or empty when this renderer does not produce that kind
   */
  Rendered render(DocumentKind kind, DocumentFacts facts);

  record Rendered(String contentType, byte[] bytes) {}
}
