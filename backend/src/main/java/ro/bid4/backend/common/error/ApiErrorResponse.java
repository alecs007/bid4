package ro.bid4.backend.common.error;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.Map;

/**
 * The one error body this API ever returns.
 *
 * <p>Shape-identical to {@code ApiErrorBody} in frontend/src/lib/types/common.ts, so the frontend's
 * ApiError parses it without a translation layer. Nothing else is added: no stack trace, no
 * exception class, no SQL constraint name. The correlation id travels in the X-Request-Id header
 * instead, where it is useful for support without being part of the contract.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiErrorResponse(
    int status, String code, String message, Map<String, String> fieldErrors) {

  public static ApiErrorResponse of(ErrorCode code) {
    return new ApiErrorResponse(code.status().value(), code.name(), code.message(), null);
  }

  public static ApiErrorResponse of(ErrorCode code, String message) {
    return new ApiErrorResponse(code.status().value(), code.name(), message, null);
  }

  public static ApiErrorResponse of(
      ErrorCode code, String message, Map<String, String> fieldErrors) {
    return new ApiErrorResponse(
        code.status().value(),
        code.name(),
        message,
        fieldErrors == null || fieldErrors.isEmpty() ? null : fieldErrors);
  }
}
