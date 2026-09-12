package ro.bid4.backend.orders.service;

/**
 * Which version of the terms is currently being shown.
 *
 * <p>A constant rather than a row, because it changes when the text does and the text ships with
 * the application. Bump it whenever the wording a party agrees to changes in substance: acceptances
 * already recorded keep naming the version they were given, which is the whole point of storing it.
 */
public final class Terms {

  /** Date-based, so the version is legible in a dispute without a lookup table. */
  public static final String CURRENT_VERSION = "2026-09-12";

  private Terms() {}
}
