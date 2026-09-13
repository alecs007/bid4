package ro.bid4.backend.billing.service;

/**
 * Everything a document states, frozen at the moment it is issued.
 *
 * <p>Passed in rather than looked up, and this is the point of the record: a document must say what
 * was true when it was issued, for ever. Handing a renderer an order id and letting it read the
 * order means reprinting last year's invoice reprints this year's numbers.
 */
public record DocumentFacts(
    String orderReference,
    String number,
    String issuedToName,
    String issuedToTaxId,
    String itemTitle,
    String causeName,
    long finalPrice,
    long platformTax,
    long shipping,
    long total,
    long donationAmount,
    short donationPercent,
    long sellerShare,
    String termsVersion) {}
