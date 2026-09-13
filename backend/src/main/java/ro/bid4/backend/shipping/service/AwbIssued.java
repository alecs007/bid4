package ro.bid4.backend.shipping.service;

/**
 * A booked parcel.
 *
 * @param awb the consignment number the parcel now travels under
 * @param courier which provider issued it, stored beside the order
 * @param trackingUrl where the buyer may follow it, provider-specific
 */
public record AwbIssued(String awb, String courier, String trackingUrl) {}
