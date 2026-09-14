package ro.bid4.backend.ops.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ro.bid4.backend.common.web.PublicCaching;
import ro.bid4.backend.ops.service.StatsService;

@RestController
@RequestMapping("/stats")
public class StatsController {
  private final StatsService stats;

  public StatsController(StatsService stats) {
    this.stats = stats;
  }

  @GetMapping("/public")
  ResponseEntity<StatsService.PublicStatsResponse> publicStats() {
    return PublicCaching.shared(stats.publicStats());
  }
}
