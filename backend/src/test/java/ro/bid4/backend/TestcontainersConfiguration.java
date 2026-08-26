package ro.bid4.backend;

import com.redis.testcontainers.RedisContainer;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Real Postgres and Redis in Docker for tests that need them.
 *
 * <p>{@code @ServiceConnection} makes Boot derive the datasource URL, credentials and Redis host
 * from the containers, so nothing here is duplicated into a properties file and drifts. The
 * containers are static, so one pair is started for the whole run rather than per class.
 *
 * <p>Postgres matters more than convenience: Flyway migrates into it on every run, so a migration
 * that would fail in production fails the build instead.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

  static final PostgreSQLContainer POSTGRES =
      new PostgreSQLContainer(DockerImageName.parse("postgres:17-alpine"));

  static final RedisContainer REDIS = new RedisContainer(DockerImageName.parse("redis:7-alpine"));

  @Bean
  @ServiceConnection
  PostgreSQLContainer postgresContainer() {
    return POSTGRES;
  }

  @Bean
  @ServiceConnection
  RedisContainer redisContainer() {
    return REDIS;
  }
}
