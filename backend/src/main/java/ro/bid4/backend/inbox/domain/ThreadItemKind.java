package ro.bid4.backend.inbox.domain;

/**
 * The four things a thread can contain.
 *
 * <p>TEXT and IMAGE have an author. SYSTEM and EVENT do not — they are the platform narrating, and
 * signing them with whoever triggered them would read as that person saying it.
 *
 * <p>The distinction between SYSTEM and EVENT is whether anything can still be done about it. A
 * SYSTEM line is a note; an EVENT is a step of a sale, and phase two draws it with whatever buttons
 * the order's *current* status allows. The row never decides that.
 */
public enum ThreadItemKind {
  TEXT,
  IMAGE,
  SYSTEM,
  EVENT
}
