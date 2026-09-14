package ro.bid4.backend.inbox.service;

import java.util.regex.Pattern;

public final class OffPlatformGuard {
  private static final Pattern PHONE = Pattern.compile("(?:\\+?4?0|\\b)(?:[ .\\-/]*\\d){9}\\b");

  private static final Pattern IBAN =
      Pattern.compile("\\bRO[ ]?\\d{2}(?:[ ]?[A-Z0-9]){16,20}\\b", Pattern.CASE_INSENSITIVE);

  private static final Pattern WALLET =
      Pattern.compile(
          "\\b(revolut|paypal|venmo|western\\s*union|iban|transfer\\s+bancar)\\b",
          Pattern.CASE_INSENSITIVE);

  private static final Pattern EMAIL = Pattern.compile("\\b[\\w.+-]+@[\\w-]+\\.[\\w.]{2,}\\b");

  private OffPlatformGuard() {}

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
