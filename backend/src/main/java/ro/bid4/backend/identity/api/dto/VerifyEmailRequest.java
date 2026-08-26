package ro.bid4.backend.identity.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * The token from the emailed link. Length-bounded so a huge body is refused before it is hashed.
 */
public record VerifyEmailRequest(
    @NotBlank(message = "Linkul de confirmare este incomplet.") @Size(max = 200) String token) {}
