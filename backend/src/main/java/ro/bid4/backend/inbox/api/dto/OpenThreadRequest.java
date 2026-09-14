package ro.bid4.backend.inbox.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record OpenThreadRequest(@NotNull UUID listingId, @Size(max = 4000) String message) {}
