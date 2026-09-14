package ro.bid4.backend.security.ratelimit;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.filter.OncePerRequestFilter;
import ro.bid4.backend.common.error.ErrorCode;
import ro.bid4.backend.common.web.RateLimitAttributes;

public class RateLimitFilter extends OncePerRequestFilter {
  private static final String BODY =
      "{\"status\":429,\"code\":\"RATE_LIMITED\",\"message\":\""
          + ErrorCode.RATE_LIMITED.message()
          + "\"}";

  private static final Set<String> CREDENTIAL_PATHS =
      Set.of("/auth/login", "/auth/register", "/auth/resend-verification");

  private static final String REFRESH_PATH = "/auth/refresh";

  private final RateLimiter rateLimiter;

  public RateLimitFilter(RateLimiter rateLimiter) {
    this.rateLimiter = rateLimiter;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    RateLimitPolicy policy = policyFor(request);
    String caller = identityOf(request);
    request.setAttribute(RateLimitAttributes.CALLER, caller);

    RateLimitDecision decision = rateLimiter.charge(policy, caller);

    response.setHeader("X-RateLimit-Limit", Long.toString(decision.limit()));
    response.setHeader("X-RateLimit-Remaining", Long.toString(decision.remaining()));

    if (decision.allowed()) {
      chain.doFilter(request, response);
      return;
    }

    response.setStatus(429);
    response.setHeader(HttpHeaders.RETRY_AFTER, Long.toString(decision.retryAfterSeconds()));
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.setCharacterEncoding(StandardCharsets.UTF_8.name());
    response.getWriter().write(BODY);
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    return HttpMethod.OPTIONS.matches(request.getMethod());
  }

  private static RateLimitPolicy policyFor(HttpServletRequest request) {
    String path = pathWithinApplication(request);
    if (CREDENTIAL_PATHS.contains(path)) {
      return RateLimitPolicy.AUTH;
    }
    if (REFRESH_PATH.equals(path)) {
      return RateLimitPolicy.REFRESH;
    }
    return HttpMethod.GET.matches(request.getMethod())
            || HttpMethod.HEAD.matches(request.getMethod())
        ? RateLimitPolicy.READ
        : RateLimitPolicy.WRITE;
  }

  private static String pathWithinApplication(HttpServletRequest request) {
    String uri = request.getRequestURI();
    String context = request.getContextPath();
    return context != null && !context.isEmpty() && uri.startsWith(context)
        ? uri.substring(context.length())
        : uri;
  }

  private static String identityOf(HttpServletRequest request) {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication != null
        && authentication.isAuthenticated()
        && authentication.getPrincipal() instanceof Jwt jwt) {
      return "user:" + jwt.getSubject();
    }
    return "ip:" + request.getRemoteAddr();
  }
}
