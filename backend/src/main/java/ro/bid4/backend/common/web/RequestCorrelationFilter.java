package ro.bid4.backend.common.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Gives every request an id, puts it in the logging context and returns it as X-Request-Id.
 *
 * <p>When a user reports "it failed", that header is the only thing needed to find the one log line
 * that matters — which is why error responses can stay silent about the internals.
 *
 * <p>An inbound X-Request-Id is honoured so a trace survives a proxy, but only if it looks like an
 * id: the value reaches the logs, and unchecked input in a log line is how log forging starts.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RequestCorrelationFilter extends OncePerRequestFilter {

  public static final String HEADER = "X-Request-Id";
  private static final String MDC_KEY = "requestId";
  private static final Pattern SAFE_ID = Pattern.compile("^[A-Za-z0-9._-]{8,64}$");

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {

    String inbound = request.getHeader(HEADER);
    String id =
        inbound != null && SAFE_ID.matcher(inbound).matches()
            ? inbound
            : UUID.randomUUID().toString();

    MDC.put(MDC_KEY, id);
    response.setHeader(HEADER, id);
    try {
      chain.doFilter(request, response);
    } finally {
      MDC.remove(MDC_KEY);
    }
  }
}
