package ro.bid4.backend.common.error;

import org.springframework.http.HttpStatus;

/**
 * Every failure the API can name, with the status it answers and the Romanian sentence the user
 * reads. Messages state the fact and never apologise, matching the frontend's voice.
 *
 * <p>The codes are the contract: the frontend switches on them, so INVALID_CREDENTIALS,
 * ACCOUNT_SUSPENDED, EMAIL_TAKEN and TERMS_REQUIRED must keep their spelling.
 */
public enum ErrorCode {
  VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "Verifică datele completate."),
  MALFORMED_REQUEST(HttpStatus.BAD_REQUEST, "Cererea nu a putut fi citită."),
  EMAIL_TAKEN(HttpStatus.BAD_REQUEST, "Există deja un cont cu acest email."),
  TERMS_REQUIRED(HttpStatus.BAD_REQUEST, "Trebuie să accepți termenii ca să continui."),

  UNAUTHENTICATED(HttpStatus.UNAUTHORIZED, "Autentifică-te ca să continui."),
  INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "Email sau parolă greșite."),
  INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "Sesiunea a expirat. Autentifică-te din nou."),

  FORBIDDEN(HttpStatus.FORBIDDEN, "Nu ai acces la această resursă."),
  ACCOUNT_SUSPENDED(HttpStatus.FORBIDDEN, "Contul este suspendat. Scrie-ne la ajutor@bid4.ro."),

  NOT_FOUND(HttpStatus.NOT_FOUND, "Resursa nu a fost găsită."),
  CONFLICT(HttpStatus.CONFLICT, "Operațiunea intră în conflict cu datele existente."),
  PAYLOAD_TOO_LARGE(HttpStatus.PAYLOAD_TOO_LARGE, "Fișierul depășește dimensiunea acceptată."),
  UNSUPPORTED_MEDIA_TYPE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Formatul trimis nu este acceptat."),

  ACCOUNT_LOCKED(
      HttpStatus.TOO_MANY_REQUESTS,
      "Prea multe încercări. Contul este blocat temporar din motive de siguranță."),
  RATE_LIMITED(HttpStatus.TOO_MANY_REQUESTS, "Prea multe cereri. Încearcă din nou în scurt timp."),

  INTERNAL(
      HttpStatus.INTERNAL_SERVER_ERROR, "A apărut o problemă. Încearcă din nou în câteva momente.");

  private final HttpStatus status;
  private final String message;

  ErrorCode(HttpStatus status, String message) {
    this.status = status;
    this.message = message;
  }

  public HttpStatus status() {
    return status;
  }

  public String message() {
    return message;
  }
}
