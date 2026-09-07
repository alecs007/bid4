package ro.bid4.backend.inbox.api.dto;

import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

/**
 * Something to say, something to show, or both.
 *
 * <p>{@code imageRefs} are ids from {@code POST /uploads/images}, so a picture sent here has been
 * through the same door as a listing photograph — re-encoded in the browser, then checked byte by
 * byte by UploadService. Nothing is uploaded through this endpoint.
 */
public record SendMessageRequest(
    @Size(max = 4000) String body, @Size(max = 4) List<UUID> imageRefs) {}
