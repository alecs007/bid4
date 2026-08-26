package ro.bid4.backend;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

/**
 * Starts the whole application against real infrastructure. It is the cheapest test that would
 * catch a broken migration, a bean that cannot be wired, or a property that no longer binds.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class BackendApplicationTests {

  @Test
  @DisplayName("the application context loads and Flyway migrates a clean database")
  void contextLoads() {}
}
