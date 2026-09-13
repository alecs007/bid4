package ro.bid4.backend.shipping.service;

/**
 * The courier, as the rest of the application needs it.
 *
 * <p>Two calls, because there are only two things a courier does that this application cares about:
 * it issues a consignment number for a parcel, and it hands back the label to stick on it.
 * Everything after that arrives unprompted, through the webhook.
 *
 * <p>Implementing Sameday means writing one class against this interface and pointing {@code
 * bid4.shipping.provider} at it. Nothing in {@code orders} changes, because nothing in {@code
 * orders} knows which courier it is talking to.
 */
public interface CourierGateway {

  /**
   * Books a parcel and returns the number it now travels under.
   *
   * <p>Must be idempotent on {@link Shipment#orderReference()}: this is called inside the
   * transaction that moves the order to LABEL_GENERATED, and a retry after a timeout must not book
   * a second parcel for the same sale.
   */
  AwbIssued issue(Shipment shipment);

  /**
   * The label, as bytes, for printing or attaching.
   *
   * <p>Separate from {@link #issue} because the two have different lifetimes: the number is needed
   * once and stored, the label may be fetched again weeks later by a seller who lost it.
   */
  LabelDocument label(String awb);

  /** Which provider answered, for the record and for support. */
  String name();
}
