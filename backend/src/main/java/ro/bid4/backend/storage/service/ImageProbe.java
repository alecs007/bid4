package ro.bid4.backend.storage.service;

import java.util.Optional;

/**
 * What a file actually is, read from the bytes rather than from what came with them.
 *
 * <p>The type on a multipart part and the extension on its name are both written by the caller, so
 * neither is evidence. This reads the handful of bytes each format is required to begin with, and
 * the type it returns is the only one the rest of the upload path will use — to decide whether the
 * file is allowed, to store it, and to serve it back.
 *
 * <p>The size is read the same way, from the header, without decoding the image. Decoding is how a
 * few kilobytes of file become hundreds of megabytes of heap, and doing it to find out whether the
 * file is too big to decode is the wrong order.
 */
final class ImageProbe {

  /** What the bytes turned out to be, and how large the picture in them is. */
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

  /** IHDR is fixed at byte 16 and is required to be the first chunk. */
  private static Optional<int[]> pngSize(byte[] b) {
    if (b.length < 24) {
      return Optional.empty();
    }
    return Optional.of(new int[] {int32(b, 16), int32(b, 20)});
  }

  /**
   * Walks the segments to the frame header, which is the only one that carries the size.
   *
   * <p>A JPEG is a chain of segments of declared length, and the dimensions live in whichever
   * start-of-frame marker the encoder used — there are a dozen, and they are all 0xC0 to 0xCF
   * except the four that mean something else.
   */
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

  /**
   * Three formats under one name.
   *
   * <p>WEBP is a RIFF container, and what follows the header decides where the size is: a lossy
   * frame (VP8␣) puts it after a start code, a lossless one (VP8L) packs both into fourteen bits
   * each, and an extended file (VP8X) states the canvas up front. All three are little-endian, and
   * the two packed forms store their sizes one less than they are.
   */
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
