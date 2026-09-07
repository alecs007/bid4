package ro.bid4.backend.inbox.api.dto;

import java.util.List;

/**
 * A thread, opened.
 *
 * <p>The head and the first page of items in one body: the page needs both to draw anything, and
 * two round trips would show the listing above an empty conversation for as long as the second one
 * took.
 *
 * <p>{@code nextCursor} is null when there is nothing older. Items come newest first, the same
 * direction the index runs; the client reverses them to draw.
 */
public record ThreadResponse(
    ConversationSummary conversation, List<ThreadItemResponse> items, String nextCursor) {}
