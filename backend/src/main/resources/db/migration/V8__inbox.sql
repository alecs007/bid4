-- bid4 — the inbox: one conversation per (listing, buyer), and one stream inside it.
--
-- There is no separate table for chat and for the deal. A buyer's question, the
-- seller's answer, and every step of the sale that follows are rows in the same
-- ordered stream, because that is how the thread has to read: the questions that
-- led to a sale sit directly above the sale, which is where anybody looks when
-- something goes wrong.
--
-- What keeps that safe is the split between position and authority. A thread_item
-- is immutable and timestamped, so it fixes where a step appears and what it said
-- at the time. It never decides what may be done next — that is read from the
-- order's own status when the thread is rendered. An item is a record; the order
-- is the truth. A forged or replayed one can show the wrong words and cannot
-- produce a working button.
--
-- Orders do not exist yet. The columns they need are here anyway (order_id,
-- event_type, order_status, payload) so that phase two adds behaviour rather than
-- another migration over a live table.

-- ---------------------------------------------------------------------------
-- conversations
-- ---------------------------------------------------------------------------

CREATE TABLE conversations (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- SUPPORT threads have no listing behind them; every other kind does.
    kind         varchar(16) NOT NULL DEFAULT 'LISTING',

    -- RESTRICT, like everywhere money has been near: a sold listing cannot be
    -- deleted out from under the conversation that recorded the sale.
    listing_id   uuid REFERENCES auctions (id) ON DELETE RESTRICT,
    buyer_id     uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    seller_id    uuid REFERENCES users (id) ON DELETE RESTRICT,

    -- Set when an offer is accepted. The thread does not become a different
    -- thread; it gains a deal.
    order_id     uuid,

    -- Denormalised so the inbox list is one query rather than one per row.
    last_item_at timestamptz NOT NULL DEFAULT now(),
    created_at   timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT conversations_kind_valid CHECK (kind IN ('LISTING', 'SUPPORT')),

    -- A listing thread names both sides; a support thread names only the member.
    CONSTRAINT conversations_shape_valid CHECK (
        (kind = 'LISTING' AND listing_id IS NOT NULL AND seller_id IS NOT NULL)
     OR (kind = 'SUPPORT' AND listing_id IS NULL AND seller_id IS NULL)
    ),

    -- Nobody negotiates with themselves, and a thread against your own listing
    -- would put one account on both sides of every authorisation check.
    CONSTRAINT conversations_two_parties CHECK (seller_id IS NULL OR seller_id <> buyer_id)
);

-- One thread per buyer per listing. Asking a second question reopens the first
-- conversation rather than starting a parallel history of the same sale.
CREATE UNIQUE INDEX conversations_listing_buyer_key
    ON conversations (listing_id, buyer_id)
    WHERE kind = 'LISTING';

-- The inbox, for each side: newest activity first.
CREATE INDEX conversations_buyer_idx  ON conversations (buyer_id, last_item_at DESC);
CREATE INDEX conversations_seller_idx ON conversations (seller_id, last_item_at DESC);
CREATE INDEX conversations_order_idx  ON conversations (order_id) WHERE order_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- participants
-- ---------------------------------------------------------------------------
--
-- Derived from the conversation, never sent by a caller. It exists as its own
-- table because what one side has read is not a property of the thread, and
-- because support joining a dispute is a third row rather than a third column.

CREATE TABLE conversation_participants (
    conversation_id uuid NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,

    role            varchar(16) NOT NULL,

    last_read_at    timestamptz,
    -- Kept rather than counted. The badge is read on every page and the count
    -- is written once per item; counting unread rows on each read would make
    -- the cheapest thing in the header the most expensive query behind it.
    unread_count    integer NOT NULL DEFAULT 0,

    archived        boolean NOT NULL DEFAULT false,
    muted           boolean NOT NULL DEFAULT false,

    joined_at       timestamptz NOT NULL DEFAULT now(),

    PRIMARY KEY (conversation_id, user_id),
    CONSTRAINT conversation_participants_role_valid
        CHECK (role IN ('BUYER', 'SELLER', 'SUPPORT')),
    CONSTRAINT conversation_participants_unread_sane CHECK (unread_count >= 0)
);

-- The badge: every thread this account has anything unread in, in one lookup.
CREATE INDEX conversation_participants_unread_idx
    ON conversation_participants (user_id)
    WHERE unread_count > 0 AND archived = false;

CREATE INDEX conversation_participants_user_idx
    ON conversation_participants (user_id, archived);

-- ---------------------------------------------------------------------------
-- thread items
-- ---------------------------------------------------------------------------

CREATE TABLE thread_items (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,

    kind            varchar(16) NOT NULL,

    -- Null for anything the platform wrote. A system line has no author, and
    -- attributing it to whoever triggered it would read as them saying it.
    sender_id       uuid REFERENCES users (id) ON DELETE SET NULL,

    body            varchar(4000),

    -- Phase two. event_type names the step, order_status is the status the
    -- order was in when it was written, and payload is a frozen snapshot for
    -- display — amounts, locker name, AWB — so history does not change its mind
    -- when the order moves on.
    event_type      varchar(32),
    order_status    varchar(32),
    payload         jsonb,

    -- Set when the body tripped the off-platform check. The item is still
    -- delivered: silently dropping it teaches people to work around the check,
    -- and the recipient is better served by a warning than by a gap.
    flagged_reason  varchar(32),

    created_at      timestamptz NOT NULL DEFAULT now(),
    -- Soft, always. An item is referenced by a read cursor and, once orders
    -- exist, by the record of a sale.
    deleted_at      timestamptz,

    CONSTRAINT thread_items_kind_valid CHECK (kind IN ('TEXT', 'IMAGE', 'SYSTEM', 'EVENT')),

    -- Said by somebody, or said by the platform. Not both, and not neither.
    CONSTRAINT thread_items_authorship_valid CHECK (
        (kind IN ('TEXT', 'IMAGE') AND sender_id IS NOT NULL)
     OR (kind IN ('SYSTEM', 'EVENT') AND sender_id IS NULL)
    ),
    CONSTRAINT thread_items_text_has_body CHECK (kind <> 'TEXT' OR length(btrim(body)) > 0),
    CONSTRAINT thread_items_event_has_type CHECK (kind <> 'EVENT' OR event_type IS NOT NULL)
);

-- The thread itself, read newest-first and paged by keyset. Descending on both
-- columns because that is the direction the query walks, and id breaks the tie
-- when two items share a timestamp.
CREATE INDEX thread_items_conversation_idx
    ON thread_items (conversation_id, created_at DESC, id DESC);

-- ---------------------------------------------------------------------------
-- attachments
-- ---------------------------------------------------------------------------
--
-- Through stored_files, so an image sent in a thread goes down the same road as
-- a listing photograph: decoded, re-encoded and stripped in the browser, then
-- checked byte by byte by UploadService before anything is stored.

-- sort_order is integer rather than smallint for the reason auction_images gives:
-- @OrderColumn is an int, and ddl-auto: validate compares the width.
CREATE TABLE thread_attachments (
    item_id        uuid    NOT NULL REFERENCES thread_items (id) ON DELETE CASCADE,
    sort_order     integer NOT NULL,
    stored_file_id uuid    NOT NULL REFERENCES stored_files (id) ON DELETE RESTRICT,

    PRIMARY KEY (item_id, sort_order),
    CONSTRAINT thread_attachments_order_range CHECK (sort_order BETWEEN 0 AND 3),
    -- The same picture twice in one message is a mistake, not an arrangement.
    CONSTRAINT thread_attachments_file_once UNIQUE (item_id, stored_file_id)
);

CREATE INDEX thread_attachments_file_idx ON thread_attachments (stored_file_id);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
--
-- Pointers, not content. Almost everything worth telling somebody already
-- happened in a thread, and a notification carrying its own copy of the news is
-- a second source of truth that will drift from the first. What is stored is
-- enough to draw one line and to know where it goes.

CREATE TABLE notifications (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,

    type       varchar(40) NOT NULL,
    -- Interpolated into the Romanian copy at render time rather than stored as
    -- a finished sentence: the wording will change, and rewriting history is
    -- not what a schema migration should be for.
    payload    jsonb NOT NULL DEFAULT '{}'::jsonb,
    -- Always in-app and always relative. An absolute URL here would be an open
    -- redirect the moment one is written by anything but us.
    deep_link  varchar(512),

    read_at    timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT notifications_link_is_relative
        CHECK (deep_link IS NULL OR deep_link LIKE '/%')
);

CREATE INDEX notifications_user_idx ON notifications (user_id, created_at DESC);

-- The other half of the badge, and the same reasoning as the participants'
-- partial index: the common case is nothing to show.
CREATE INDEX notifications_unread_idx
    ON notifications (user_id, created_at DESC)
    WHERE read_at IS NULL;
