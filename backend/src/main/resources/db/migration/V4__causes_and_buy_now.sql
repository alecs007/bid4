-- bid4 — the cause as its own page, and the price that ends an auction outright.
--
-- V3 created the nine columns an auction card reads off a cause. This adds what
-- the cause's own page shows: the story, the imagery it is told through, the
-- paperwork a supporter can check, and the counters. The submission wizard's
-- data — beneficiary, guardian, NGO, evidence, consents — is still to come; it
-- is what an operator reads when approving, not what a visitor reads.

-- ---------------------------------------------------------------------------
-- causes: the rest of the page
-- ---------------------------------------------------------------------------

ALTER TABLE causes
    ADD COLUMN story             text        NOT NULL DEFAULT '',
    ADD COLUMN cover_url         varchar(8192) NOT NULL DEFAULT '',
    ADD COLUMN supporter_count   integer     NOT NULL DEFAULT 0,
    ADD COLUMN deadline          timestamptz,
    ADD COLUMN rejection_reason  varchar(500),
    ADD COLUMN submitted_at      timestamptz,
    ADD COLUMN approved_at       timestamptz,

    -- The validation block: who is behind this, in a form someone can check.
    -- Kept on the row rather than in a side table because it is exactly one per
    -- cause and every read of the cause page wants all of it.
    ADD COLUMN legal_name          varchar(160) NOT NULL DEFAULT '',
    ADD COLUMN registration_number varchar(32)  NOT NULL DEFAULT '',
    ADD COLUMN representative_name varchar(120) NOT NULL DEFAULT '',
    ADD COLUMN contact_email       varchar(254) NOT NULL DEFAULT '',
    ADD COLUMN contact_phone       varchar(20)  NOT NULL DEFAULT '',
    ADD COLUMN website             varchar(255),
    -- Masked everywhere except staff views. Never the raw IBAN in a response.
    ADD COLUMN payout_account_ref  varchar(64)  NOT NULL DEFAULT '';

ALTER TABLE causes
    ADD CONSTRAINT causes_supporters_positive CHECK (supporter_count >= 0),
    ADD CONSTRAINT causes_story_length CHECK (char_length(story) <= 4000),
    ADD CONSTRAINT causes_contact_email_lower
        CHECK (contact_email = lower(contact_email)),
    -- A rejection that does not say why is not a decision the organiser can act
    -- on, so the reason travels with the status.
    ADD CONSTRAINT causes_rejection_explained
        CHECK (status <> 'REJECTED' OR rejection_reason IS NOT NULL);

-- ---------------------------------------------------------------------------
-- causes: who the money is actually for
-- ---------------------------------------------------------------------------

-- One row per cause for all of it, because every one of these is exactly one
-- per cause and an operator reading an application wants the whole of it at
-- once. The guardian and NGO halves are null unless the beneficiary type calls
-- for them, which the CHECK below enforces rather than trusts.
ALTER TABLE causes
    ADD COLUMN beneficiary_type          varchar(16)  NOT NULL DEFAULT 'INDIVIDUAL',
    ADD COLUMN beneficiary_full_name     varchar(120) NOT NULL DEFAULT '',
    ADD COLUMN beneficiary_contact_email varchar(254) NOT NULL DEFAULT '',
    ADD COLUMN beneficiary_contact_phone varchar(20)  NOT NULL DEFAULT '',
    ADD COLUMN beneficiary_county        varchar(40)  NOT NULL DEFAULT '',
    ADD COLUMN beneficiary_city          varchar(80)  NOT NULL DEFAULT '',
    -- MINOR only. Kept because it changes what staff are required to check.
    ADD COLUMN beneficiary_age           integer,

    ADD COLUMN guardian_full_name        varchar(120),
    ADD COLUMN guardian_relation         varchar(20),
    ADD COLUMN guardian_phone            varchar(20),

    ADD COLUMN ngo_legal_name            varchar(160),
    ADD COLUMN ngo_registration_number   varchar(32),
    ADD COLUMN ngo_representative_name   varchar(120),

    ADD COLUMN payout_method             varchar(24) NOT NULL DEFAULT 'STRIPE_INDIVIDUAL',
    ADD COLUMN payout_iban               varchar(34),
    ADD COLUMN payout_stripe_onboarded   boolean     NOT NULL DEFAULT false,

    ADD COLUMN verification_status       varchar(24) NOT NULL DEFAULT 'UNVERIFIED',
    -- What the cause may raise before verification completes.
    ADD COLUMN verification_cap          bigint,
    ADD COLUMN verification_rejection    varchar(500),

    -- What the organiser signed, kept so an operator can see it was asked.
    ADD COLUMN consent_truthfulness      boolean NOT NULL DEFAULT false,
    ADD COLUMN consent_controlled_release boolean NOT NULL DEFAULT false,
    ADD COLUMN consent_terms             boolean NOT NULL DEFAULT false,
    ADD COLUMN consent_guardian_authority boolean,
    ADD COLUMN consents_accepted_at      timestamptz;

ALTER TABLE causes
    ADD CONSTRAINT causes_beneficiary_type_valid
        CHECK (beneficiary_type IN ('INDIVIDUAL', 'MINOR', 'NGO')),
    ADD CONSTRAINT causes_guardian_relation_valid
        CHECK (guardian_relation IS NULL OR guardian_relation IN (
            'PARENT', 'GRANDPARENT', 'SIBLING', 'LEGAL_GUARDIAN', 'OTHER')),
    ADD CONSTRAINT causes_payout_method_valid
        CHECK (payout_method IN ('STRIPE_INDIVIDUAL', 'STRIPE_NGO')),
    ADD CONSTRAINT causes_verification_status_valid
        CHECK (verification_status IN ('UNVERIFIED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED')),
    ADD CONSTRAINT causes_beneficiary_age_range
        CHECK (beneficiary_age IS NULL OR beneficiary_age BETWEEN 0 AND 120),
    -- Money for a minor always reaches a verified legal guardian, so a minor
    -- without one is not a cause this platform can pay out.
    ADD CONSTRAINT causes_minor_has_guardian
        CHECK (beneficiary_type <> 'MINOR'
               OR (guardian_full_name IS NOT NULL AND guardian_relation IS NOT NULL)),
    ADD CONSTRAINT causes_ngo_is_registered
        CHECK (beneficiary_type <> 'NGO'
               OR (ngo_legal_name IS NOT NULL AND ngo_registration_number IS NOT NULL));

-- ---------------------------------------------------------------------------
-- cause_evidence — support for the story, as opposed to proof of identity
-- ---------------------------------------------------------------------------

CREATE TABLE cause_evidence (
    id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cause_id  uuid NOT NULL REFERENCES causes (id) ON DELETE CASCADE,
    type      varchar(32)  NOT NULL,
    file_name varchar(255) NOT NULL,
    file_ref  varchar(8192) NOT NULL,
    note      varchar(500),

    CONSTRAINT cause_evidence_type_valid CHECK (type IN (
        'MEDICAL_RECORD', 'MEDICAL_LETTER', 'TREATMENT_QUOTE', 'SOCIAL_REPORT',
        'INCOME_PROOF', 'SCHOOL_PROOF', 'VET_RECORD', 'DAMAGE_PROOF', 'OTHER'))
);

CREATE INDEX cause_evidence_cause_idx ON cause_evidence (cause_id);

-- ---------------------------------------------------------------------------
-- cause_images — the gallery, in the organiser's order
-- ---------------------------------------------------------------------------

-- Ordered and rewritable: a cause is told through several photographs and the
-- organiser decides which one leads. Reordering rewrites the rows for that
-- cause rather than shuffling ids around, which keeps the order a property of
-- the set instead of a column somebody has to keep consistent.
CREATE TABLE cause_images (
    cause_id   uuid    NOT NULL REFERENCES causes (id) ON DELETE CASCADE,
    sort_order integer NOT NULL,
    url        varchar(8192) NOT NULL,

    PRIMARY KEY (cause_id, sort_order),
    CONSTRAINT cause_images_order_range CHECK (sort_order BETWEEN 0 AND 11),
    CONSTRAINT cause_images_url_present CHECK (char_length(url) > 0)
);

-- ---------------------------------------------------------------------------
-- cause_documents — the paperwork behind the claim
-- ---------------------------------------------------------------------------

CREATE TABLE cause_documents (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cause_id    uuid NOT NULL REFERENCES causes (id) ON DELETE CASCADE,
    kind        varchar(32)  NOT NULL,
    file_name   varchar(255) NOT NULL,
    -- A stored_files reference once uploads exist; the presigned URL is minted
    -- per request and never kept here.
    file_url    varchar(8192) NOT NULL,
    size_bytes  bigint      NOT NULL,
    uploaded_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT cause_documents_kind_valid CHECK (kind IN (
        'STATUTE', 'REGISTRATION_CERTIFICATE', 'ID_DOCUMENT', 'BANK_PROOF', 'OTHER')),
    CONSTRAINT cause_documents_size_sane CHECK (size_bytes > 0)
);

CREATE INDEX cause_documents_cause_idx ON cause_documents (cause_id, uploaded_at);

-- ---------------------------------------------------------------------------
-- auctions: the price that ends it outright
-- ---------------------------------------------------------------------------

-- A seller may name a price they would simply accept. A bid that reaches it
-- does not start a race to the close — it wins there and then, and the auction
-- is settled at that price rather than at whatever was offered, because that is
-- the number the page advertised and nobody should pay more than it for having
-- typed too much.
ALTER TABLE auctions
    ADD COLUMN buy_now_price bigint;

ALTER TABLE auctions
    -- Below the starting price it would end the auction before it opened; equal
    -- to it, the first bid always ends it, which is a fixed-price sale wearing
    -- an auction's clothes.
    ADD CONSTRAINT auctions_buy_now_above_start
        CHECK (buy_now_price IS NULL OR buy_now_price > starting_price),
    -- A reserve above the buy-now price could never be met by taking it.
    ADD CONSTRAINT auctions_buy_now_covers_reserve
        CHECK (buy_now_price IS NULL OR reserve_price IS NULL
               OR buy_now_price >= reserve_price);

-- Browsing "can I just take this one" is a filter worth an index, and only
-- among what is still open.
CREATE INDEX auctions_live_buy_now_idx ON auctions (buy_now_price)
    WHERE status = 'LIVE' AND buy_now_price IS NOT NULL;

-- ---------------------------------------------------------------------------
-- bids: a ceiling on what can be offered
-- ---------------------------------------------------------------------------

-- Mirrors CatalogRules.MAX_BID — one million lei. An offer nobody could honour
-- is a way to win an auction and then walk away from it, and the fee split and
-- the donation are both computed from this number. The service refuses it
-- first; this is the backstop for anything that reaches the table another way.
ALTER TABLE bids
    ADD CONSTRAINT bids_amount_ceiling CHECK (amount <= 100000000);
