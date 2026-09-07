package ro.bid4.backend.inbox.api.dto;

/**
 * What the header badge is drawn from.
 *
 * <p>Threads with something waiting, not items waiting: "3" over the inbox mark means three
 * conversations to look at, which is the number somebody can act on.
 */
public record UnreadCounts(long messages, long notifications) {}
