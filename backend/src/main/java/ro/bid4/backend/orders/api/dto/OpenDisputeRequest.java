package ro.bid4.backend.orders.api.dto;

import jakarta.validation.constraints.Size;

/**
 * Why the buyer is holding the money back.
 *
 * <p>Optional. Somebody who has just opened a damaged parcel should not be made to write an essay
 * before the payment stops moving, and the conversation the notice lands in is where the rest of it
 * gets said anyway.
 */
public record OpenDisputeRequest(@Size(max = 1000) String reason) {}
