-- bid4 — the auction, which is the object and the sale at once.
--
-- There is no products table. Nothing on this platform exists outside the
-- auction that offers it, so a second entity would forever be one row with one
-- owner and one lifecycle shared with this one. Title, description, imagery,
-- category, condition and weight live here.
--
-- causes arrives in its core form only. An auction cannot exist without the
-- cause it donates to, and the auction pages read nine of its columns, so those
-- nine plus the row's own identity are created here. The verification model —
-- beneficiaries, guardians, NGOs, evidence, payout, consents — is V4's work and
-- ALTERs onto this table.

-- Romanian is typed both ways — "bicicleta" has to find "Bicicletă" — and nobody
-- adds the marks in a search box. unaccent folds the column; the service folds
-- the term the same way before it is bound.
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ---------------------------------------------------------------------------
-- causes (core)
-- ---------------------------------------------------------------------------

CREATE TABLE causes (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- RESTRICT rather than CASCADE: money has moved through a cause, and
    -- deleting the organiser must fail loudly rather than take the record away.
    organizer_id      uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,

    name              varchar(120) NOT NULL,
    slug              varchar(140) NOT NULL,
    short_description varchar(160) NOT NULL,
    category          varchar(24)  NOT NULL,
    -- Wide for the same reason auction_images.url is: a presigned object URL
    -- carries its whole signature and already outgrows a naive cap, and
    -- development imagery is an inline SVG data URI until uploads exist.
    image_url         varchar(8192) NOT NULL DEFAULT '',

    status            varchar(20)  NOT NULL DEFAULT 'DRAFT',

    goal_amount       bigint NOT NULL,
    raised_amount     bigint NOT NULL DEFAULT 0,

    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT causes_status_valid CHECK (status IN (
        'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ACTIVE', 'SUSPENDED')),
    CONSTRAINT causes_category_valid CHECK (category IN (
        'medical', 'educatie', 'copii', 'animale', 'mediu', 'varstnici',
        'comunitate', 'urgente')),
    CONSTRAINT causes_slug_shape      CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,138}[a-z0-9]$'),
    CONSTRAINT causes_name_len        CHECK (char_length(name) BETWEEN 3 AND 120),
    -- Mirrors CAUSE.MIN_GOAL and CAUSE.MAX_GOAL in frontend/src/lib/config.ts,
    -- in bani.
    CONSTRAINT causes_goal_range      CHECK (goal_amount BETWEEN 50000 AND 50000000),
    CONSTRAINT causes_raised_positive CHECK (raised_amount >= 0)
);

CREATE UNIQUE INDEX causes_slug_key ON causes (slug);
CREATE INDEX causes_organizer_idx   ON causes (organizer_id, created_at DESC);
-- The public list and the operator queue are the two ways this table is read.
CREATE INDEX causes_status_idx      ON causes (status, created_at DESC);

CREATE TRIGGER causes_set_updated_at
    BEFORE UPDATE ON causes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- auctions
-- ---------------------------------------------------------------------------

CREATE TABLE auctions (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id          uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    cause_id           uuid NOT NULL REFERENCES causes (id) ON DELETE RESTRICT,

    -- what is being sold
    title              varchar(120)  NOT NULL,
    description        varchar(4000) NOT NULL,
    category           varchar(24)   NOT NULL,
    -- item_condition, not condition: the bare word is reserved in enough
    -- dialects and tools that it is not worth the quoting it would need.
    item_condition     varchar(16)   NOT NULL,
    weight_grams       integer       NOT NULL,

    -- the sale
    donation_percent   smallint NOT NULL,
    starting_price     bigint   NOT NULL,
    current_price      bigint   NOT NULL,
    bid_increment      bigint   NOT NULL,
    -- Never shown to a buyer. The read model exposes whether it was met, not
    -- what it is, and the response omits the number for anyone but the seller.
    reserve_price      bigint,

    start_time         timestamptz NOT NULL,
    end_time           timestamptz NOT NULL,
    anti_snipe_seconds integer     NOT NULL DEFAULT 120,

    status             varchar(20) NOT NULL DEFAULT 'DRAFT',
    winner_id          uuid REFERENCES users (id) ON DELETE SET NULL,
    -- Denormalised counters. bids and auction_watchers are the truth; these
    -- exist so a page of cards is not a page of aggregate queries.
    bid_count          integer NOT NULL DEFAULT 0,
    watcher_count      integer NOT NULL DEFAULT 0,
    extension_count    integer NOT NULL DEFAULT 0,

    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT auctions_status_valid CHECK (status IN (
        'DRAFT', 'PENDING_REVIEW', 'SCHEDULED', 'LIVE', 'ENDED', 'SOLD',
        'UNSOLD', 'CANCELLED')),
    CONSTRAINT auctions_condition_valid CHECK (item_condition IN (
        'NEW', 'LIKE_NEW', 'VERY_GOOD', 'GOOD', 'USED')),
    CONSTRAINT auctions_category_valid CHECK (category IN (
        'moda', 'electronice', 'casa', 'arta', 'carti', 'sport', 'jucarii',
        'colectii', 'bijuterii')),

    -- Every bound below mirrors AUCTION, DONATION or SHIPPING in
    -- frontend/src/lib/config.ts, so a value the listing form accepts is a
    -- value this table accepts and the two cannot disagree about what is valid.
    CONSTRAINT auctions_donation_range   CHECK (donation_percent BETWEEN 5 AND 100),
    CONSTRAINT auctions_starting_range   CHECK (starting_price BETWEEN 100 AND 10000000),
    CONSTRAINT auctions_increment_min    CHECK (bid_increment >= 100),
    CONSTRAINT auctions_anti_snipe_range CHECK (anti_snipe_seconds BETWEEN 30 AND 600),
    CONSTRAINT auctions_weight_range     CHECK (weight_grams BETWEEN 1 AND 15000),
    CONSTRAINT auctions_window           CHECK (end_time > start_time),
    -- The price only ever climbs from where it started.
    CONSTRAINT auctions_price_climbs     CHECK (current_price >= starting_price),
    CONSTRAINT auctions_reserve_sane     CHECK (reserve_price IS NULL
                                                OR reserve_price >= starting_price),
    CONSTRAINT auctions_counters_positive CHECK (bid_count >= 0 AND watcher_count >= 0
                                                 AND extension_count >= 0),
    -- A winner belongs to a finished sale and nowhere else.
    CONSTRAINT auctions_winner_settled   CHECK (winner_id IS NULL
                                                OR status IN ('SOLD', 'ENDED'))
);

-- The default listing order: soonest deadline among the live ones.
CREATE INDEX auctions_status_end_time_idx ON auctions (status, end_time);
CREATE INDEX auctions_cause_idx           ON auctions (cause_id, status);
CREATE INDEX auctions_seller_idx          ON auctions (seller_id, created_at DESC);
-- The filter row on /licitatii narrows by category and by price, and only ever
-- within what is still open, so these carry only those.
CREATE INDEX auctions_live_category_idx   ON auctions (category, end_time)
    WHERE status = 'LIVE';
CREATE INDEX auctions_live_price_idx      ON auctions (current_price)
    WHERE status = 'LIVE';

CREATE TRIGGER auctions_set_updated_at
    BEFORE UPDATE ON auctions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- auction_images
-- ---------------------------------------------------------------------------

-- Ordered, because the first image is the card and the seller chose which one.
--
-- The column is wide because a URL here is not always short: a presigned object
-- URL carries its whole signature, and placeholder imagery is an inline SVG data
-- URI until uploads exist. It is still bounded — a picture reference that runs to
-- kilobytes is a mistake, and eight of them is a request worth refusing.
-- sort_order is integer rather than smallint because @OrderColumn is an int and
-- ddl-auto: validate compares the width, not just the family.
CREATE TABLE auction_images (
    auction_id uuid    NOT NULL REFERENCES auctions (id) ON DELETE CASCADE,
    sort_order integer NOT NULL,
    url        varchar(8192) NOT NULL,

    PRIMARY KEY (auction_id, sort_order),
    CONSTRAINT auction_images_order_range CHECK (sort_order BETWEEN 0 AND 11),
    CONSTRAINT auction_images_url_present CHECK (char_length(url) > 0)
);

-- ---------------------------------------------------------------------------
-- bids
-- ---------------------------------------------------------------------------

CREATE TABLE bids (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id          uuid NOT NULL REFERENCES auctions (id) ON DELETE CASCADE,
    -- RESTRICT: a bid is a commitment to pay, so the record of who made it must
    -- outlive any wish to delete the account that made it.
    bidder_id           uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    amount              bigint NOT NULL,
    status              varchar(16) NOT NULL DEFAULT 'ACTIVE',
    triggered_extension boolean NOT NULL DEFAULT false,
    created_at          timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT bids_status_valid    CHECK (status IN ('ACTIVE', 'OUTBID', 'WINNING',
                                                      'WON', 'LOST')),
    CONSTRAINT bids_amount_positive CHECK (amount > 0)
);

-- One offer per bidder per auction: raising replaces your bid, it does not
-- stack. Enforced here so a double-submitted form cannot produce two.
CREATE UNIQUE INDEX bids_one_per_bidder ON bids (auction_id, bidder_id);
-- At most one leader at a time. The read path resolves who is winning from this
-- index rather than by sorting the whole history of the auction.
CREATE UNIQUE INDEX bids_one_winning    ON bids (auction_id) WHERE status = 'WINNING';
CREATE INDEX bids_auction_amount_idx    ON bids (auction_id, amount DESC);
CREATE INDEX bids_bidder_idx            ON bids (bidder_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- auction_watchers
-- ---------------------------------------------------------------------------

CREATE TABLE auction_watchers (
    auction_id uuid NOT NULL REFERENCES auctions (id) ON DELETE CASCADE,
    user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),

    PRIMARY KEY (auction_id, user_id)
);

CREATE INDEX auction_watchers_user_idx ON auction_watchers (user_id, created_at DESC);
