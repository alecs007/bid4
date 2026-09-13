package ro.bid4.backend.billing.api.dto;

import java.time.Instant;

/**
 * One document, as a party sees it listed.
 *
 * <p>Includes documents that are promised and not yet rendered, with {@code available} false.
 * Listing an invoice before it exists is deliberate: somebody looking for one can see that there
 * will be one and roughly when, which is a better answer than an empty list.
 *
 * @param kind the enum name, which the client maps to its own wording
 * @param number null for a document that carries no series
 * @param available whether the bytes can be fetched right now
 */
public record DocumentResponse(
    String kind,
    String number,
    String issuedToName,
    long amount,
    boolean available,
    Instant issuedAt) {}
