package ro.bid4.backend.storage.service;

import io.minio.GetObjectArgs;
import io.minio.GetObjectResponse;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import java.io.InputStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;
import ro.bid4.backend.common.config.Bid4Properties;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.common.error.ErrorCode;

/**
 * The only thing in the application that talks to MinIO.
 *
 * <p>Everything above it works in {@code StoredFile} rows and never in buckets and keys, which is
 * what keeps the choice of where an object lives out of the services that merely need one.
 */
@Component
public class ObjectStore {

  private static final Logger log = LoggerFactory.getLogger(ObjectStore.class);

  private final MinioClient client;
  private final Bid4Properties.Storage settings;

  public ObjectStore(MinioClient client, Bid4Properties properties) {
    this.client = client;
    this.settings = properties.storage();
  }

  public String publicBucket() {
    return settings.publicBucket();
  }

  public String privateBucket() {
    return settings.privateBucket();
  }

  /**
   * Writes the bytes, with the length declared up front.
   *
   * <p>Declared rather than streamed with an unknown size: given -1 the client buffers in five-
   * megabyte parts to discover the length, and the length is something this caller already knows
   * because it counted the bytes on the way in.
   */
  public void put(String bucket, String key, byte[] bytes, String contentType) {
    try (InputStream body = new java.io.ByteArrayInputStream(bytes)) {
      client.putObject(
          PutObjectArgs.builder().bucket(bucket).object(key).stream(body, bytes.length, -1)
              // What the object is served as later. Never taken from the
              // upload's own header: that is the uploader's claim, and this is
              // the one the sniffing agreed with.
              .contentType(contentType)
              .build());
    } catch (Exception failure) {
      // Logged with the cause, because the caller is told nothing useful on
      // purpose and this is then the only account of what went wrong. A bucket
      // that does not exist and a key that was refused look identical from the
      // outside.
      log.error("Storing {}/{} failed", bucket, key, failure);
      throw new ApiException(
          ErrorCode.INTERNAL, "Fișierul nu a putut fi salvat. Încearcă din nou.");
    }
  }

  /** Opens the object for reading. The caller closes it. */
  public GetObjectResponse open(String bucket, String key) {
    try {
      return client.getObject(GetObjectArgs.builder().bucket(bucket).object(key).build());
    } catch (Exception failure) {
      log.error("Reading {}/{} failed", bucket, key, failure);
      throw ApiException.notFound("Fișierul");
    }
  }

  /**
   * Best effort, and deliberately silent.
   *
   * <p>Called when the row that would have made an object reachable could not be written. Failing
   * here would replace a leaked object nobody can address with an error the caller can do nothing
   * about.
   */
  public void discard(String bucket, String key) {
    try {
      client.removeObject(RemoveObjectArgs.builder().bucket(bucket).object(key).build());
    } catch (Exception ignored) {
      // An unreferenced object is unreachable; the bucket's lifecycle rules
      // are where sweeping it up belongs.
    }
  }

  /** The client itself, built from the same settings the rest of the tree is validated against. */
  @Configuration
  static class MinioClientConfig {

    @Bean
    MinioClient minioClient(Bid4Properties properties) {
      Bid4Properties.Storage storage = properties.storage();
      return MinioClient.builder()
          .endpoint(storage.endpoint())
          .credentials(storage.accessKey(), storage.secretKey())
          .build();
    }
  }
}
