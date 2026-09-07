package ro.bid4.backend.inbox.domain;

/** What a thread is about. */
public enum ConversationKind {
  /** A buyer and a seller, about one listing. */
  LISTING,
  /** A member and bid4. No listing, and the other side is whichever operator answers. */
  SUPPORT
}
