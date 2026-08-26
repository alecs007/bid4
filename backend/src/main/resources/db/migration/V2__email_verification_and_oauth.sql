-- bid4 — proving an address belongs to its owner, and signing in without a password.
--
-- Two ways to reach an account now: an address the owner confirmed, or an
-- identity a provider already confirmed for us. Both end in the same row of
-- users, which is what keeps the rest of the system from caring which was used.

-- ---------------------------------------------------------------------------
-- users: a password is no longer the only credential
-- ---------------------------------------------------------------------------

-- An account created through Google has no password and must never be given a
-- placeholder one — an empty or fabricated hash is a credential someone can
-- eventually guess. The service layer enforces that every account keeps at
-- least one way in; a CHECK cannot, because it may not read another table.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- email_verification_tokens
-- ---------------------------------------------------------------------------

-- Stored as a hash, like refresh tokens: the value is mailed once and is never
-- recoverable from here, so a dump of this table cannot verify anyone.
CREATE TABLE email_verification_tokens (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash  varchar(64) NOT NULL,
    -- The address the token was issued for. If the account changes address
    -- before the link is used, the token no longer matches and is refused.
    email       varchar(254) NOT NULL,
    expires_at  timestamptz NOT NULL,
    consumed_at timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT evt_hash_shape  CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT evt_email_lower CHECK (email = lower(email)),
    CONSTRAINT evt_lifespan    CHECK (expires_at > created_at)
);

CREATE UNIQUE INDEX evt_hash_key ON email_verification_tokens (token_hash);
CREATE INDEX evt_user_idx       ON email_verification_tokens (user_id, created_at DESC);
-- Only live tokens are ever swept, so the index carries only those.
CREATE INDEX evt_expiry_idx     ON email_verification_tokens (expires_at)
    WHERE consumed_at IS NULL;

-- ---------------------------------------------------------------------------
-- oauth_identities
-- ---------------------------------------------------------------------------

-- One row per provider account linked to a bid4 account. A user may hold both a
-- password and several identities; all of them resolve to the same user_id.
CREATE TABLE oauth_identities (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    provider         varchar(16) NOT NULL,
    -- The provider's stable subject id, never the address: an address can be
    -- reassigned by the provider, the subject cannot.
    provider_user_id varchar(191) NOT NULL,
    -- What the provider said the address was, kept for audit rather than trust.
    email            varchar(254),
    created_at       timestamptz NOT NULL DEFAULT now(),
    last_login_at    timestamptz,

    CONSTRAINT oauth_provider_valid CHECK (provider IN ('GOOGLE', 'FACEBOOK')),
    CONSTRAINT oauth_email_lower    CHECK (email IS NULL OR email = lower(email))
);

-- One provider account cannot be attached to two bid4 accounts.
CREATE UNIQUE INDEX oauth_provider_subject_key
    ON oauth_identities (provider, provider_user_id);
-- Nor can one bid4 account hold two identities from the same provider.
CREATE UNIQUE INDEX oauth_user_provider_key
    ON oauth_identities (user_id, provider);
