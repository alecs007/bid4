package ro.bid4.backend.shipping.service;

/**
 * The label to print, as the courier returned it.
 *
 * @param contentType usually {@code application/pdf}; some providers answer ZPL for label printers
 * @param filename what it should be saved as
 */
public record LabelDocument(String contentType, String filename, byte[] bytes) {}
