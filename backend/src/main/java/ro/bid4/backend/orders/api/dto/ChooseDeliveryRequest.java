package ro.bid4.backend.orders.api.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ChooseDeliveryRequest(@NotNull UUID deliveryMethodId) {}
