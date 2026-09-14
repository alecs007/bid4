package ro.bid4.backend.inbox.api.dto;

import java.util.List;

public record ThreadResponse(
    ConversationSummary conversation, List<ThreadItemResponse> items, String nextCursor) {}
