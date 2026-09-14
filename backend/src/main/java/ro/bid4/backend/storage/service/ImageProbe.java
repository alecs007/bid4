package ro.bid4.backend.storage.service;

import java.util.Optional;

final class ImageProbe {
  record Probed(String contentType, int width, int height) {
    long pixels() {
      return (long) width * height;
    }
  }

  private ImageProbe() {}

  static Optional<Probed> probe(byte[] bytes) {
    if (isJpeg(bytes)) {
      return jpegSize(bytes).map(size -> new Probed("image/jpeg", size[0], size[1]));
    }
    if (isPng(bytes)) {
      return pngSize(bytes).map(size -> new Probed("image/png", size[0], size[1]));
    }
    if (isWebp(bytes)) {
      return webpSize(bytes).map(size -> new Probed("image/webp", size[0], size[1]));
    }
    return Optional.empty();
  }

  private static boolean isJpeg(byte[] b) {
    return b.length > 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF;
  }

  private static boolean isPng(byte[] b) {
    return b.length > 8
        && (b[0] & 0xFF) == 0x89
        && b[1] == 'P'
        && b[2] == 'N'
        && b[3] == 'G'
        && (b[4] & 0xFF) == 0x0D
        && (b[5] & 0xFF) == 0x0A
        && (b[6] & 0xFF) == 0x1A
        && (b[7] & 0xFF) == 0x0A;
  }

  private static boolean isWebp(byte[] b) {
    return b.length > 12
        && b[0] == 'R'
        && b[1] == 'I'
        && b[2] == 'F'
        && b[3] == 'F'
        && b[8] == 'W'
        && b[9] == 'E'
        && b[10] == 'B'
        && b[11] == 'P';
  }

  private static Optional<int[]> pngSize(byte[] b) {
    if (b.length < 24) {
      return Optional.empty();
    }
    return Optional.of(new int[] {int32(b, 16), int32(b, 20)});
  }

  private static Optional<int[]> jpegSize(byte[] b) {
    int at = 2;
    while (at + 9 < b.length) {
      if ((b[at] & 0xFF) != 0xFF) {
        return Optional.empty();
      }
      int marker = b[at + 1] & 0xFF;
      int length = int16(b, at + 2);
      if (length < 2) {
        return Optional.empty();
      }
      boolean startOfFrame =
          marker >= 0xC0 && marker <= 0xCF && marker != 0xC4 && marker != 0xC8 && marker != 0xCC;
      if (startOfFrame) {
        return Optional.of(new int[] {int16(b, at + 7), int16(b, at + 5)});
      }
      at += 2 + length;
    }
    return Optional.empty();
  }

  private static Optional<int[]> webpSize(byte[] b) {
    if (b.length < 30) {
      return Optional.empty();
    }
    String chunk = new String(b, 12, 4, java.nio.charset.StandardCharsets.US_ASCII);

    return switch (chunk) {
      case "VP8 " -> Optional.of(new int[] {le16(b, 26) & 0x3FFF, le16(b, 28) & 0x3FFF});
      case "VP8L" -> {
        int packed = le32(b, 21);
        yield Optional.of(new int[] {(packed & 0x3FFF) + 1, ((packed >> 14) & 0x3FFF) + 1});
      }
      case "VP8X" -> Optional.of(new int[] {le24(b, 24) + 1, le24(b, 27) + 1});
      default -> Optional.empty();
    };
  }

  private static int int32(byte[] b, int at) {
    return ((b[at] & 0xFF) << 24)
        | ((b[at + 1] & 0xFF) << 16)
        | ((b[at + 2] & 0xFF) << 8)
        | (b[at + 3] & 0xFF);
  }

  private static int int16(byte[] b, int at) {
    return ((b[at] & 0xFF) << 8) | (b[at + 1] & 0xFF);
  }

  private static int le16(byte[] b, int at) {
    return (b[at] & 0xFF) | ((b[at + 1] & 0xFF) << 8);
  }

  private static int le24(byte[] b, int at) {
    return (b[at] & 0xFF) | ((b[at + 1] & 0xFF) << 8) | ((b[at + 2] & 0xFF) << 16);
  }

  private static int le32(byte[] b, int at) {
    return (b[at] & 0xFF)
        | ((b[at + 1] & 0xFF) << 8)
        | ((b[at + 2] & 0xFF) << 16)
        | ((b[at + 3] & 0xFF) << 24);
  }
}
