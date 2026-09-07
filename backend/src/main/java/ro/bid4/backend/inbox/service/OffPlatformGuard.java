package ro.bid4.backend.inbox.service;

import java.util.regex.Pattern;

/**
 * Notices when a message is trying to move the deal off bid4.
 *
 * <p>This is not spam filtering. A sale that leaves the platform takes the escrow and the donation
 * with it — the buyer loses the protection they were promised and the cause gets nothing — so a
 * phone number in a thread is worth a warning in a way that it would not be on an ordinary
 * marketplace.
 *
 * <p>It flags and never blocks. Refusing the message teaches people to write "zero seven two…" and
 * moves the same conversation somewhere nothing can see it; delivering it with a warning leaves the
 * exchange visible, tells the person receiving it what they are being asked to do, and leaves a
 * record if it later becomes a dispute.
 *
 * <p>Deliberately blunt. It is read by a human on the other side, so a false positive costs a
 * banner nobody needed, and the patterns are the ones that actually appear: a Romanian mobile
 * number, an IBAN, a revolut/paypal handle.
 */
public final class OffPlatformGuard {

  /**
   * Seven or more digits with anything or nothing between them.
   *
   * <p>Wide on purpose: "07 12 34 56 78" and "0712.345.678" are the same number, and a pattern that
   * only matched the tidy form would be beaten by a space.
   */
  private static final Pattern PHONE = Pattern.compile("(?:\\+?4?0|\\b)(?:[ .\\-/]*\\d){9}\\b");

  private static final Pattern IBAN =
      Pattern.compile("\\bRO[ ]?\\d{2}(?:[ ]?[A-Z0-9]){16,20}\\b", Pattern.CASE_INSENSITIVE);

  private static final Pattern WALLET =
      Pattern.compile(
          "\\b(revolut|paypal|venmo|western\\s*union|iban|transfer\\s+bancar)\\b",
          Pattern.CASE_INSENSITIVE);

  private static final Pattern EMAIL = Pattern.compile("\\b[\\w.+-]+@[\\w-]+\\.[\\w.]{2,}\\b");

  private OffPlatformGuard() {}

  /** The reason to show, or null when there is nothing to say. */
  public static String inspect(String body) {
    if (body == null || body.isBlank()) {
      return null;
    }
    if (IBAN.matcher(body).find() || WALLET.matcher(body).find()) {
      return "PAYMENT_DETAILS";
    }
    if (PHONE.matcher(body).find()) {
      return "PHONE_NUMBER";
    }
    if (EMAIL.matcher(body).find()) {
      return "EMAIL_ADDRESS";
    }
    return null;
  }
}
