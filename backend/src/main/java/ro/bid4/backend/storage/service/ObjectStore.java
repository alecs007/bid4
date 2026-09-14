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

  public void put(String bucket, String key, byte[] bytes, String contentType) {
    try (InputStream body = new java.io.ByteArrayInputStream(bytes)) {
      client.putObject(
          PutObjectArgs.builder().bucket(bucket).object(key).stream(body, bytes.length, -1)
              .contentType(contentType)
              .build());
    } catch (Exception failure) {
      log.error("Storing {}/{} failed", bucket, key, failure);
      throw new ApiException(
          ErrorCode.INTERNAL, "Fișierul nu a putut fi salvat. Încearcă din nou.");
    }
  }

  public GetObjectResponse open(String bucket, String key) {
    try {
      return client.getObject(GetObjectArgs.builder().bucket(bucket).object(key).build());
    } catch (Exception failure) {
      log.error("Reading {}/{} failed", bucket, key, failure);
      throw ApiException.notFound("Fișierul");
    }
  }

  public void discard(String bucket, String key) {
    try {
      client.removeObject(RemoveObjectArgs.builder().bucket(bucket).object(key).build());
    } catch (Exception ignored) {
    }
  }

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
