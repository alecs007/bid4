-- The paperwork a sale produces.
--
-- Rows rather than files guessed at from the order's status: an invoice has a
-- number that must never change once issued, was addressed to somebody, and has
-- to be produceable years later exactly as it was sent. None of that survives
-- being re-rendered on demand from whatever the order looks like now.
--
-- The bytes live in object storage and this table holds the key. A document is
-- therefore immutable in both places: the row is never updated, and the object
-- is written once under a key derived from the row.

CREATE TABLE order_documents (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id     uuid        NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    kind         varchar(32) NOT NULL,
    -- Series and number, e.g. "BID4-2026-000418". Unique across the platform,
    -- because that is what makes it a document and not a label.
    number       varchar(64),
    -- Who it is addressed to. A proforma and an invoice go to the buyer, a
    -- payout statement to the seller, a donation receipt to the cause.
    issued_to    uuid        NOT NULL REFERENCES users (id),
    amount       bigint      NOT NULL DEFAULT 0,
    -- Where the bytes are. Null while a document is promised but not yet
    -- rendered, which is the state the UI already shows as "în curând".
    storage_key  varchar(512),
    content_type varchar(128),
    issued_at    timestamptz NOT NULL DEFAULT now(),

    -- One document of a kind per sale. Issuing is retried on failure and must
    -- not produce two invoices for one order.
    CONSTRAINT order_documents_once UNIQUE (order_id, kind)
);

CREATE INDEX order_documents_by_order ON order_documents (order_id);

CREATE UNIQUE INDEX order_documents_by_number
    ON order_documents (number)
    WHERE number IS NOT NULL;

-- Issued documents are evidence, like acceptances. Never edited, never deleted
-- while the order exists; a mistake is corrected by issuing a credit note.
CREATE OR REPLACE FUNCTION order_documents_are_final() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Issued documents cannot be changed.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_documents_no_update
    BEFORE UPDATE ON order_documents
    FOR EACH ROW EXECUTE FUNCTION order_documents_are_final();
