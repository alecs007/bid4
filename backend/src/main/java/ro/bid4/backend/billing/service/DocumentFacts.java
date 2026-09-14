package ro.bid4.backend.billing.service;

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
