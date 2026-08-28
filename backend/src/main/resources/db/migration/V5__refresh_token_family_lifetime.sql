-- ---------------------------------------------------------------------------
-- V5 — an absolute ceiling on a refresh-token family
--
-- Rotation set expires_at to now + 30 days on every exchange, so a session used
-- once a month never expired. Nobody was ever made to sign in again, and a
-- stolen token that its holder kept spending stayed valid indefinitely.
--
-- family_started_at is the one timestamp rotation does not move: every token
-- inherits it from the one it replaced, so the chain carries the moment its
-- first ancestor was issued. bid4.jwt.absolute-refresh-ttl is measured from it.
-- ---------------------------------------------------------------------------

ALTER TABLE refresh_tokens ADD COLUMN family_started_at timestamptz;

-- Existing chains cannot be reconstructed: rotated_to points forward, so a live
-- token does not know its ancestor. Each one is treated as the start of its own
-- family, which gives current sessions a full window from here rather than
-- signing everybody out on deploy.
UPDATE refresh_tokens SET family_started_at = issued_at WHERE family_started_at IS NULL;

ALTER TABLE refresh_tokens ALTER COLUMN family_started_at SET NOT NULL;
ALTER TABLE refresh_tokens ALTER COLUMN family_started_at SET DEFAULT now();

-- A family cannot begin after a token that belongs to it.
ALTER TABLE refresh_tokens
    ADD CONSTRAINT refresh_tokens_family_origin CHECK (family_started_at <= issued_at);

-- The sweeper deletes by expiry across every row, revoked ones included, so the
-- existing partial index on live tokens does not serve it.
CREATE INDEX refresh_tokens_sweep_idx ON refresh_tokens (expires_at);
