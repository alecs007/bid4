package ro.bid4.backend.identity.api.dto;

import jakarta.validation.constraints.Size;

public record HomeAddressPayload(
    @Size(max = 120) String recipientName,
    @Size(max = 200) String street,
    @Size(max = 80) String city,
    @Size(max = 80) String county,
    @Size(max = 12) String postalCode,
    @Size(max = 200) String details) {}
