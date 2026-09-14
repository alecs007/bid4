package ro.bid4.backend.common.error;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
  VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "Verifică datele completate."),
  MALFORMED_REQUEST(HttpStatus.BAD_REQUEST, "Cererea nu a putut fi citită."),
  EMAIL_TAKEN(HttpStatus.BAD_REQUEST, "Există deja un cont cu acest email."),
  TERMS_REQUIRED(HttpStatus.BAD_REQUEST, "Trebuie să accepți termenii pentru a continua."),

  UNAUTHENTICATED(HttpStatus.UNAUTHORIZED, "Autentifică-te pentru a continua."),
  INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "Email sau parolă greșite."),
  INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "Sesiunea a expirat. Autentifică-te din nou."),

  FORBIDDEN(HttpStatus.FORBIDDEN, "Nu ai acces la această resursă."),
  EMAIL_NOT_VERIFIED(
      HttpStatus.FORBIDDEN,
      "Confirmă adresa de email pentru a continua. Ți-am trimis un link pe email la înregistrare."),
  ACCOUNT_SUSPENDED(HttpStatus.FORBIDDEN, "Contul este suspendat. Scrie-ne la ajutor@bid4.ro."),

  VERIFICATION_LINK_INVALID(
      HttpStatus.BAD_REQUEST, "Linkul de confirmare nu mai este valabil. Cere unul nou."),
  OAUTH_EMAIL_MISSING(
      HttpStatus.BAD_REQUEST,
      "Contul folosit nu are o adresă de email confirmată. Încearcă altă metodă."),

  AUCTION_NOT_LIVE(HttpStatus.BAD_REQUEST, "Licitația nu mai acceptă oferte."),
  BID_TOO_LOW(HttpStatus.BAD_REQUEST, "Oferta este mai mică decât minimul acceptat."),
  BID_TOO_HIGH(HttpStatus.BAD_REQUEST, "Oferta depășește maximul acceptat."),
  BID_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "Nu poți licita încă."),
  RETRACT_NOT_ALLOWED(
      HttpStatus.BAD_REQUEST, "Poți retrage doar propria ofertă aflată pe primul loc."),
  CAUSE_NOT_APPROVED(HttpStatus.BAD_REQUEST, "Poți lista doar pentru cauze aprobate."),

  NOT_FOUND(HttpStatus.NOT_FOUND, "Resursa nu a fost găsită."),
  CONFLICT(HttpStatus.CONFLICT, "Operațiunea intră în conflict cu datele existente."),
  PAYLOAD_TOO_LARGE(HttpStatus.PAYLOAD_TOO_LARGE, "Fișierul depășește dimensiunea acceptată."),
  UNSUPPORTED_MEDIA_TYPE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Formatul trimis nu este acceptat."),

  ACCOUNT_LOCKED(
      HttpStatus.TOO_MANY_REQUESTS,
      "Prea multe încercări. Contul este blocat temporar din motive de siguranță."),
  RATE_LIMITED(HttpStatus.TOO_MANY_REQUESTS, "Prea multe cereri. Încearcă din nou în scurt timp."),
  VERIFICATION_RESEND_TOO_SOON(
      HttpStatus.TOO_MANY_REQUESTS,
      "Am trimis deja un link. Verifică inbox-ul și încearcă din nou în câteva minute."),

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
