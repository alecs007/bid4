package ro.bid4.backend.orders.api.dto;

import ro.bid4.backend.identity.domain.DeliveryMethodType;

public record DeliverySnapshotResponse(
    DeliveryMethodType type,
    String label,
    String easyboxLockerId,
    String lockerName,
    String lockerAddress,
    String recipientName,
    String street,
    String city,
    String county,
    String postalCode,
    String addressDetails,
    String phone) {}
