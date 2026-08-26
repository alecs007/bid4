package ro.bid4.backend.common.error;

import java.util.Map;

/** A failure the application chose to name. Anything else becomes an INTERNAL. */
public class ApiException extends RuntimeException {

  private final transient ErrorCode code;
  private final transient Map<String, String> fieldErrors;

  public ApiException(ErrorCode code) {
    this(code, code.message(), null);
  }

  public ApiException(ErrorCode code, String message) {
    this(code, message, null);
  }

  public ApiException(ErrorCode code, String message, Map<String, String> fieldErrors) {
    // No cause is attached on purpose: these are expected outcomes, not faults,
    // and a stack trace for "wrong password" is noise in the log.
    super(message, null, false, false);
    this.code = code;
    this.fieldErrors = fieldErrors;
  }

  public ErrorCode code() {
    return code;
  }

  public Map<String, String> fieldErrors() {
    return fieldErrors;
  }

  public static ApiException notFound(String what) {
    return new ApiException(ErrorCode.NOT_FOUND, what + " nu a fost găsit.");
  }

  public static ApiException forbidden(String message) {
    return new ApiException(ErrorCode.FORBIDDEN, message);
  }
}
