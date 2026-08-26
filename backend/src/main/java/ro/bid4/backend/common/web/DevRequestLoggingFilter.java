package ro.bid4.backend.common.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * One line per request, for a developer watching the console.
 *
 * <p>Development only. In production this would double the log volume to say what an access log
 * already says, and the interesting events are the ones the services log by name.
 *
 * <p>Placed outside the security chain on purpose, so the requests it reports include the ones
 * security refused. A 401 that never reaches a controller is exactly the request someone is trying
 * to understand when they turn the log on.
 */
@Component
@Profile("dev")
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class DevRequestLoggingFilter extends OncePerRequestFilter {

  private static final Logger log = LoggerFactory.getLogger("ro.bid4.backend.http");

  /**
   * Anything slower than this is worth noticing before it reaches a user.
   *
   * <p>A second rather than something tighter, because signing in is legitimately slow — bcrypt at
   * cost 12 is a quarter of a second of deliberate work — and a threshold that flags the credential
   * path on every login teaches people to ignore the warning.
   */
  private static final long SLOW_MILLIS = 1_000;

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {

    long startedAt = System.nanoTime();
    try {
      chain.doFilter(request, response);
    } finally {
      long millis = (System.nanoTime() - startedAt) / 1_000_000;
      String query = request.getQueryString();
      String caller = String.valueOf(request.getAttribute(RateLimitAttributes.CALLER));

      String line = "{} {}{} → {} in {}ms [{}]";
      Object[] parts = {
        request.getMethod(),
        request.getRequestURI(),
        query == null ? "" : "?" + query,
        response.getStatus(),
        millis,
        caller
      };

      // A failure or a slow answer is the reason someone is reading this, so it
      // is louder than the traffic it is buried in.
      if (response.getStatus() >= 500 || millis >= SLOW_MILLIS) {
        log.warn(line, parts);
      } else if (response.getStatus() >= 400) {
        log.info(line, parts);
      } else {
        log.debug(line, parts);
      }
    }
  }

  /** Health checks answer on their own port and are noise here. */
  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    return request.getRequestURI().startsWith("/actuator");
  }
}
