-- bid4 — the order: escrow, and the only thing allowed to say what happens next.
--
-- A thread_item records that a step happened and what it said at the time. This
-- row decides what may happen now. Everything the buyer or the seller can press
-- is derived from `status` here and from which of them is asking, so an item in
-- a conversation can be wrong, forged or replayed and still not move a sale.
--
-- Money is frozen at acceptance. The price can go on being argued about in the
-- thread; what the buyer owes and what the cause and the seller are due were
-- settled when the offer was taken, and a fee schedule that changes next month
-- must not rewrite a sale that closed this one.
--
-- No money moves yet. There is no payment provider wired up and no ledger, so
-- PAID_HELD is reached by an endpoint that says so — phase three replaces the
-- inside of that step without touching this shape.

CREATE TABLE orders (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Human-facing, and printed on labels and invoices: CMD-2026-0417.
    reference             varchar(24) NOT NULL,

    -- RESTRICT throughout. A sale is a record that outlives anybody's wish to
    -- tidy up, and losing the listing under it loses what was sold.
    auction_id            uuid NOT NULL REFERENCES auctions (id)   ON DELETE RESTRICT,
    buyer_id              uuid NOT NULL REFERENCES users (id)      ON DELETE RESTRICT,
    seller_id             uuid NOT NULL REFERENCES users (id)      ON DELETE RESTRICT,
    cause_id              uuid NOT NULL REFERENCES causes (id)     ON DELETE RESTRICT,

    status                varchar(24) NOT NULL DEFAULT 'AWAITING_CONFIRMATION',

    -- Money, in bani, frozen at acceptance.
    final_price           bigint NOT NULL,
    -- The buyer's tax. bid4's whole cut: the seller's share is not touched.
    platform_tax          bigint NOT NULL,
    shipping              bigint NOT NULL DEFAULT 0,
    total_paid            bigint NOT NULL,
    donation_amount       bigint NOT NULL,
    donation_percent      smallint NOT NULL,
    seller_share          bigint NOT NULL,

    -- Where it goes, copied rather than referenced. The buyer may edit or delete
    -- the saved address afterwards; the label must not change under the parcel.
    delivery_type         varchar(16),
    delivery_label        varchar(80),
    easybox_locker_id     varchar(40),
    locker_name           varchar(160),
    locker_address        varchar(255),
    recipient_name        varchar(120),
    street                varchar(255),
    city                  varchar(80),
    county                varchar(40),
    postal_code           varchar(12),
    address_details       varchar(255),
    phone                 varchar(20),

    awb                   varchar(40),
    courier               varchar(40),
    label_file_id         uuid REFERENCES stored_files (id) ON DELETE SET NULL,

    -- Deadlines the platform keeps rather than the parties: the buyer has a
    -- while to confirm, and the money releases itself if nobody disputes.
    confirmation_deadline timestamptz,
    auto_release_at       timestamptz,
    payment_failure_reason varchar(160),

    -- Optimistic locking. Two tabs pressing "am primit coletul" must release
    -- once, and the alternative is a lock held across a payment provider call.
    version               integer NOT NULL DEFAULT 0,

    created_at            timestamptz NOT NULL DEFAULT now(),
    paid_at               timestamptz,
    delivered_at          timestamptz,
    released_at           timestamptz,

    CONSTRAINT orders_status_valid CHECK (status IN (
        'AWAITING_CONFIRMATION', 'AWAITING_PAYMENT', 'PAYMENT_FAILED', 'PAID_HELD',
        'LABEL_GENERATED', 'DROPPED_OFF', 'IN_TRANSIT', 'ARRIVED_AT_LOCKER',
        'DELIVERED', 'COMPLETED', 'DISPUTE_OPEN', 'DISPUTE_RESOLVED',
        'REFUNDED', 'CANCELLED')),

    CONSTRAINT orders_two_parties CHECK (buyer_id <> seller_id),
    CONSTRAINT orders_delivery_type_valid
        CHECK (delivery_type IS NULL OR delivery_type IN ('EASYBOX', 'HOME_COURIER')),

    -- The arithmetic, so a bug in the fee code cannot write a sale that does not
    -- add up. Both halves of the price, and what the buyer was charged for it.
    CONSTRAINT orders_price_divides CHECK (donation_amount + seller_share = final_price),
    CONSTRAINT orders_total_adds_up CHECK (total_paid = final_price + platform_tax + shipping),
    CONSTRAINT orders_donation_percent_range CHECK (donation_percent BETWEEN 0 AND 100),
    CONSTRAINT orders_amounts_not_negative CHECK (
        final_price >= 0 AND platform_tax >= 0 AND shipping >= 0
        AND donation_amount >= 0 AND seller_share >= 0),

    -- A parcel cannot be on its way to nowhere.
    CONSTRAINT orders_shipping_needs_delivery CHECK (
        awb IS NULL OR delivery_type IS NOT NULL)
);

-- One live order per listing. A second acceptance while the first is unpaid
-- would be two buyers for one object, and no amount of care in the service
-- layer is worth as much here as the index that makes it impossible.
CREATE UNIQUE INDEX orders_one_open_per_auction
    ON orders (auction_id)
    WHERE status NOT IN ('CANCELLED', 'REFUNDED');

CREATE UNIQUE INDEX orders_reference_key ON orders (reference);
CREATE INDEX orders_buyer_idx  ON orders (buyer_id, created_at DESC);
CREATE INDEX orders_seller_idx ON orders (seller_id, created_at DESC);
CREATE INDEX orders_status_idx ON orders (status, created_at DESC);

-- The two clocks a scheduled job will read. Partial, because almost no order is
-- waiting on either at any given moment.
CREATE INDEX orders_auto_release_idx ON orders (auto_release_at)
    WHERE auto_release_at IS NOT NULL AND status = 'DELIVERED';
CREATE INDEX orders_confirmation_idx ON orders (confirmation_deadline)
    WHERE confirmation_deadline IS NOT NULL AND status = 'AWAITING_CONFIRMATION';

-- ---------------------------------------------------------------------------
-- tracking
-- ---------------------------------------------------------------------------
--
-- What the courier said, in their words. Kept as its own rows rather than as a
-- column on the order because the order holds one status and this holds the
-- journey, and the two answer different questions.

CREATE TABLE order_tracking_events (
    id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,

    status   varchar(24) NOT NULL,
    label    varchar(160) NOT NULL,
    location varchar(120),
    at       timestamptz NOT NULL DEFAULT now(),

    -- The courier's own id for the scan. Unique, so a webhook delivered twice
    -- moves the parcel once.
    external_id varchar(80)
);

CREATE INDEX order_tracking_order_idx ON order_tracking_events (order_id, at DESC);
CREATE UNIQUE INDEX order_tracking_external_key ON order_tracking_events (external_id)
    WHERE external_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- the thread's half
-- ---------------------------------------------------------------------------

-- Now that orders exist, the column the inbox left waiting can point at one.
ALTER TABLE conversations
    ADD CONSTRAINT conversations_order_fk
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE RESTRICT;

-- A step of a sale appears in its thread exactly once. This is what makes a
-- transition safe to retry: the write that posts the card cannot post it twice,
-- so a failed transaction can be replayed without the thread growing a second
-- copy of "banii sunt în siguranță".
ALTER TABLE thread_items
    ADD COLUMN order_id uuid REFERENCES orders (id) ON DELETE CASCADE;

CREATE UNIQUE INDEX thread_items_one_event_per_step
    ON thread_items (order_id, event_type)
    WHERE order_id IS NOT NULL AND event_type IS NOT NULL;
