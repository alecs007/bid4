-- What each party agreed to, and when.
--
-- "They accepted the terms" is worthless without "which terms, and at what
-- moment". A version string and a timestamp per acceptance is the difference
-- between a record and a claim, and it is the thing that has to survive a
-- dispute months later — so the text version is stored beside the act rather
-- than looked up from whatever is current when somebody asks.
--
-- Acceptance is recorded where the act happens, not once at registration: the
-- buyer agrees to the sale when the total becomes known, to the payment when
-- they pay, and the seller agrees to the shipping terms when they issue a
-- label. Each is a separate row because each is a separate promise.

CREATE TABLE order_agreements (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id      uuid        NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    user_id       uuid        NOT NULL REFERENCES users (id),
    kind          varchar(32) NOT NULL,
    terms_version varchar(32) NOT NULL,
    accepted_at   timestamptz NOT NULL DEFAULT now(),

    -- One acceptance of a given kind per party per order. Repeating a step must
    -- not write a second promise, and the first one is the one that counts.
    CONSTRAINT order_agreements_once UNIQUE (order_id, user_id, kind)
);

CREATE INDEX order_agreements_by_order ON order_agreements (order_id);

-- Acceptances are evidence. They are never edited and never deleted while the
-- order they belong to exists; the FK cascade above is the only way one goes,
-- and only when the order itself is gone.
CREATE OR REPLACE FUNCTION order_agreements_are_final() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Acceptances cannot be changed.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_agreements_no_update
    BEFORE UPDATE ON order_agreements
    FOR EACH ROW EXECUTE FUNCTION order_agreements_are_final();
