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

@Component
@Profile("dev")
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class DevRequestLoggingFilter extends OncePerRequestFilter {
  private static final Logger log = LoggerFactory.getLogger("ro.bid4.backend.http");

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

      if (response.getStatus() >= 500 || millis >= SLOW_MILLIS) {
        log.warn(line, parts);
      } else if (response.getStatus() >= 400) {
        log.info(line, parts);
      } else {
        log.debug(line, parts);
      }
    }
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    return request.getRequestURI().startsWith("/actuator");
  }
}
