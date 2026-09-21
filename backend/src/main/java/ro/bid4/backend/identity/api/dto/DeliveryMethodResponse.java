package ro.bid4.backend.identity.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

public record DeliveryMethodResponse(
    UUID id,
    UUID userId,
    String type,
    String label,
    String easyboxLockerId,
    String lockerName,
    String lockerAddress,
    HomeAddressPayload homeAddress,
    String phone,
    @JsonProperty("isDefault") boolean isDefault) {}
