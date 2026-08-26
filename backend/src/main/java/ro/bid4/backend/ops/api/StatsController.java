package ro.bid4.backend.ops.api;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ro.bid4.backend.ops.service.StatsService;

/** The counters the homepage puts in front of a first-time visitor. */
@RestController
@RequestMapping("/stats")
public class StatsController {

  private final StatsService stats;

  public StatsController(StatsService stats) {
    this.stats = stats;
  }

  @GetMapping("/public")
  StatsService.PublicStatsResponse publicStats() {
    return stats.publicStats();
  }
}
