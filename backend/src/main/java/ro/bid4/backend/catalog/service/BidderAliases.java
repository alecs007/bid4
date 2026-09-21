package ro.bid4.backend.catalog.service;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.HexFormat;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;
import ro.bid4.backend.common.config.Bid4Properties;

@Component
public class BidderAliases {
  private static final String ALGORITHM = "HmacSHA256";
  private static final String PURPOSE = "bidder-alias:";

  private final SecretKeySpec key;

  public BidderAliases(Bid4Properties properties) {
    this.key =
        new SecretKeySpec(
            (PURPOSE + properties.jwt().secret()).getBytes(StandardCharsets.UTF_8), ALGORITHM);
  }

  public String of(UUID auctionId, UUID bidderId) {
    try {
      Mac mac = Mac.getInstance(ALGORITHM);
      mac.init(key);
      byte[] digest = mac.doFinal((auctionId + ":" + bidderId).getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(digest, 0, 6);
    } catch (GeneralSecurityException impossible) {
      throw new IllegalStateException(impossible);
    }
  }
}
