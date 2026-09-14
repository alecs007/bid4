package ro.bid4.backend.storage.service;

import java.util.List;
import java.util.UUID;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

public final class MediaUrls {
  private MediaUrls() {}

  public static String forFile(UUID fileRef) {
    return ServletUriComponentsBuilder.fromCurrentContextPath()
        .path("/media/")
        .path(fileRef.toString())
        .toUriString();
  }

  public static List<String> resolveAll(List<String> stored) {
    return stored.stream().map(MediaUrls::resolve).toList();
  }

  private static String resolve(String value) {
    try {
      return forFile(UUID.fromString(value));
    } catch (IllegalArgumentException notAnId) {
      return value;
    }
  }
}
