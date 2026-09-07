package ro.bid4.backend.orders.api.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * Which of the buyer's saved addresses this parcel goes to.
 *
 * <p>An id, never an address. The row is looked up and checked to be the buyer's own, then copied —
 * accepting a typed address here would let a caller send somebody else's parcel anywhere.
 */
public record ChooseDeliveryRequest(@NotNull UUID deliveryMethodId) {}
