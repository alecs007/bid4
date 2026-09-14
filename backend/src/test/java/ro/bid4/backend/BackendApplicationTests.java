package ro.bid4.backend;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class BackendApplicationTests {
  @Test
  @DisplayName("the application context loads and Flyway migrates a clean database")
  void contextLoads() {}
}
