package ro.bid4.backend.storage.service;

import java.util.List;
import java.util.UUID;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

/**
 * Where a stored picture can be seen.
 *
 * <p>One stable address per object, and the same one every time, which is the whole reason imagery
 * is served by this application rather than handed out as a presigned link. A presigned URL is
 * signed with the moment it was made, so it is different on every page load: the browser cannot
 * cache the picture behind it, and a listing that stored one would stop showing its photographs
 * when the signature aged out. Short-lived links are right for an identity document, which is read
 * once by one person; they are wrong for a photograph on a page that anyone may open tomorrow.
 *
 * <p>Built from the request rather than from configuration, so the host in it is whatever the
 * caller actually reached — including through a proxy, which Tomcat's own valve has already
 * resolved from the forwarded headers it is configured to trust.
 */
public final class MediaUrls {

  private MediaUrls() {}

  public static String forFile(UUID fileRef) {
    return ServletUriComponentsBuilder.fromCurrentContextPath()
        .path("/media/")
        .path(fileRef.toString())
        .toUriString();
  }

  /**
   * What a listing stores, turned into what a page can show.
   *
   * <p>Anything that is not an id is passed through as it stands. Listings seeded for development
   * carry ordinary paths, and so would any imagery that came from somewhere other than an upload;
   * neither is worth a second column to tell apart from a uuid.
   */
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
