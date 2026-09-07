package ro.bid4.backend.inbox.domain;

/**
 * Which side of the thread somebody is on.
 *
 * <p>Derived from the conversation when the row is written, never sent by a caller — it is what
 * every authorisation check in the inbox reads, so accepting it from a request body would be
 * handing out the answer to the question being asked.
 */
public enum ParticipantRole {
  BUYER,
  SELLER,
  /** An operator who has joined. Reads everything; writes as themselves, not as the platform. */
  SUPPORT
}
