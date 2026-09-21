package ro.bid4.backend.identity.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DeliveryMethodRequest(
    @NotBlank String type,
    @Size(max = 80) String label,
    @Size(max = 40) String easyboxLockerId,
    @Size(max = 120) String lockerName,
    @Size(max = 200) String lockerAddress,
    @Valid HomeAddressPayload homeAddress,
    @NotBlank @Size(max = 32) String phone,
    @JsonProperty("isDefault") boolean isDefault) {}
