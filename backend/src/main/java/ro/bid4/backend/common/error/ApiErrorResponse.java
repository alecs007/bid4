package ro.bid4.backend.common.error;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.Map;

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
