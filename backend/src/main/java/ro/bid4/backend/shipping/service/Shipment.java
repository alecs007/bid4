package ro.bid4.backend.shipping.service;

import ro.bid4.backend.identity.domain.DeliveryMethodType;

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
