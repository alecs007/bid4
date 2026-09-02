-- A member bid4 has actually checked.
--
-- Nothing in the schema said this before, so the listing page and the public profile fell back to
-- showing the account type — "Persoană fizică" or "Organizație" — in a green chip with a tick.
-- That looked exactly like a verification and was nothing of the kind: being an organisation is a
-- fact about paperwork, not a judgement anybody made.
--
-- Set by staff, never by the member. There is no self-serve route to it and no endpoint yet; an
-- operator flips the column until the admin area exists to do it properly.
ALTER TABLE users
    ADD COLUMN verified boolean NOT NULL DEFAULT false;

-- Only ever read as "show the tag?", and almost every row is false. A partial index keeps the
-- lookup cheap without carrying the overwhelming majority that will never match.
CREATE INDEX idx_users_verified ON users (id) WHERE verified;
