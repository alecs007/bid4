package ro.bid4.backend.cause.api;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ro.bid4.backend.cause.api.dto.CauseResponse;
import ro.bid4.backend.cause.service.CauseService;
import ro.bid4.backend.common.web.PublicCaching;
import ro.bid4.backend.security.web.Viewers;

@RestController
@RequestMapping("/causes")
public class CauseController {
  private final CauseService causes;

  public CauseController(CauseService causes) {
    this.causes = causes;
  }

  @GetMapping
  List<CauseResponse> list(
      @RequestParam(required = false) @Size(max = 120) String q,
      @RequestParam(required = false) @Size(max = 16) List<String> category,
      @RequestParam(required = false) @Min(1) @Max(200) Integer limit,
      @AuthenticationPrincipal Jwt jwt) {
    return causes.list(q, category, limit, Viewers.from(jwt));
  }

  @GetMapping("/trending")
  ResponseEntity<List<CauseResponse>> trending(@AuthenticationPrincipal Jwt jwt) {
    return PublicCaching.perViewer(causes.trending(Viewers.from(jwt)));
  }

  @GetMapping("/{idOrSlug}")
  CauseResponse get(@PathVariable String idOrSlug, @AuthenticationPrincipal Jwt jwt) {
    return causes.get(idOrSlug, Viewers.from(jwt));
  }
}
