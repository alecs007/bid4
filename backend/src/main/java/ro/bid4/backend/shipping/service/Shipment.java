package ro.bid4.backend.shipping.service;

import ro.bid4.backend.identity.domain.DeliveryMethodType;

/**
 * What is being sent, and where.
 *
 * <p>A flat record rather than an {@code Order}: the courier package must not depend on the order
 * package, or the two become one thing and neither can be tested without the other. {@code orders}
 * builds this and hands it over.
 *
 * @param orderReference the human reference, which is also the idempotency key for booking
 * @param weightGrams the parcel, as the listing declared it
 * @param recipientLockerId set for EASYBOX only, and the one field the courier routes on
 */
public record Shipment(
    String orderReference,
    DeliveryMethodType deliveryType,
    int weightGrams,
    String itemTitle,
    String senderName,
    String senderPhone,
    String recipientName,
    String recipientPhone,
    String recipientLockerId,
    String recipientAddress,
    String recipientCity,
    String recipientCounty,
    String recipientPostalCode) {}
