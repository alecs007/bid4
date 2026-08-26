package ro.bid4.backend.common.error;

import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Turns every exception into the one error body the frontend understands.
 *
 * <p>The rule throughout: the client is told what it can act on, and the server keeps the detail.
 * An unexpected failure is logged in full with its correlation id and answered with a sentence that
 * describes nothing about the internals.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(ApiException.class)
  ResponseEntity<ApiErrorResponse> handleApi(ApiException ex) {
    return ResponseEntity.status(ex.code().status())
        .body(ApiErrorResponse.of(ex.code(), ex.getMessage(), ex.fieldErrors()));
  }

  /**
   * A request body or a bound query object that failed its constraints: the caller gets the field
   * map.
   *
   * <p>Typed as BindException rather than MethodArgumentNotValidException, which extends it. Query
   * objects bound with {@code @ModelAttribute} report failures as the plain parent, and without
   * this they would fall through to the catch-all and answer 500 to what is a bad request.
   */
  @ExceptionHandler(BindException.class)
  ResponseEntity<ApiErrorResponse> handleBodyValidation(BindException ex) {
    Map<String, String> fields = new LinkedHashMap<>();
    ex.getBindingResult()
        .getFieldErrors()
        .forEach(
            error -> fields.putIfAbsent(error.getField(), messageOf(error.getDefaultMessage())));
    return respond(ErrorCode.VALIDATION_FAILED, ErrorCode.VALIDATION_FAILED.message(), fields);
  }

  /** The same, for constraints on path variables and query parameters. */
  @ExceptionHandler(HandlerMethodValidationException.class)
  ResponseEntity<ApiErrorResponse> handleParamValidation(HandlerMethodValidationException ex) {
    Map<String, String> fields = new LinkedHashMap<>();
    ex.getParameterValidationResults()
        .forEach(
            result ->
                result
                    .getResolvableErrors()
                    .forEach(
                        error ->
                            fields.putIfAbsent(
                                result.getMethodParameter().getParameterName(),
                                messageOf(error.getDefaultMessage()))));
    return respond(ErrorCode.VALIDATION_FAILED, ErrorCode.VALIDATION_FAILED.message(), fields);
  }

  /** Malformed JSON, a wrong type, an unreadable body. Never echoed back. */
  @ExceptionHandler({
    HttpMessageNotReadableException.class,
    MethodArgumentTypeMismatchException.class
  })
  ResponseEntity<ApiErrorResponse> handleUnreadable(Exception ex) {
    log.debug("Unreadable request", ex);
    return respond(ErrorCode.MALFORMED_REQUEST, ErrorCode.MALFORMED_REQUEST.message(), null);
  }

  @ExceptionHandler(NoResourceFoundException.class)
  ResponseEntity<ApiErrorResponse> handleNoResource(NoResourceFoundException ex) {
    return respond(ErrorCode.NOT_FOUND, ErrorCode.NOT_FOUND.message(), null);
  }

  @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
  ResponseEntity<ApiErrorResponse> handleMethod(HttpRequestMethodNotSupportedException ex) {
    return respond(ErrorCode.NOT_FOUND, ErrorCode.NOT_FOUND.message(), null);
  }

  @ExceptionHandler(MaxUploadSizeExceededException.class)
  ResponseEntity<ApiErrorResponse> handleTooLarge(MaxUploadSizeExceededException ex) {
    return respond(ErrorCode.PAYLOAD_TOO_LARGE, ErrorCode.PAYLOAD_TOO_LARGE.message(), null);
  }

  @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
  ResponseEntity<ApiErrorResponse> handleMediaType(HttpMediaTypeNotSupportedException ex) {
    return respond(
        ErrorCode.UNSUPPORTED_MEDIA_TYPE, ErrorCode.UNSUPPORTED_MEDIA_TYPE.message(), null);
  }

  /**
   * A unique index or a CHECK rejected the write. The constraint name would tell an attacker the
   * shape of the schema, so it is logged and never returned.
   */
  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<ApiErrorResponse> handleIntegrity(DataIntegrityViolationException ex) {
    log.warn("Database rejected a write", ex);
    return respond(ErrorCode.CONFLICT, ErrorCode.CONFLICT.message(), null);
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<ApiErrorResponse> handleUnexpected(Exception ex, HttpServletRequest request) {
    log.error("Unhandled failure on {} {}", request.getMethod(), request.getRequestURI(), ex);
    return respond(ErrorCode.INTERNAL, ErrorCode.INTERNAL.message(), null);
  }

  private static ResponseEntity<ApiErrorResponse> respond(
      ErrorCode code, String message, Map<String, String> fields) {
    return ResponseEntity.status(code.status()).body(ApiErrorResponse.of(code, message, fields));
  }

  private static String messageOf(String raw) {
    return raw == null || raw.isBlank() ? ErrorCode.VALIDATION_FAILED.message() : raw;
  }
}
