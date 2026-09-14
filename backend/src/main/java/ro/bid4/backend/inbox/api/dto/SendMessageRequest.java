package ro.bid4.backend.inbox.api.dto;

import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record SendMessageRequest(
    @Size(max = 4000) String body, @Size(max = 4) List<UUID> imageRefs) {}
