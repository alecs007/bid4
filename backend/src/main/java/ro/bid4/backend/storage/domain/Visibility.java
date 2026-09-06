package ro.bid4.backend.storage.domain;

/**
 * Which bucket an object lives in, and therefore who may ask for it.
 *
 * <p>PUBLIC is listing imagery: it is shown to anyone browsing, so it is served by id through
 * {@code /media/{id}} with no account required. PRIVATE is everything that identifies a person —
 * identity documents, guardianship proof — which is never served that way and leaves the bucket
 * only as a presigned URL minted for one reader.
 *
 * <p>Neither bucket carries an anonymous policy, so "public" here means this application will serve
 * it, not that the storage will.
 */
public enum Visibility {
  PUBLIC,
  PRIVATE
}
