package ro.bid4.backend.inbox.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/**
 * Start a conversation about a listing, or reopen the one that already exists.
 *
 * <p>The seller is read from the listing and the buyer from the token. Neither is a field here:
 * whom you are writing to is a consequence of what you are writing about, and letting a caller name
 * the other side would be letting them write to anybody.
 */
public record OpenThreadRequest(@NotNull UUID listingId, @Size(max = 4000) String message) {}
