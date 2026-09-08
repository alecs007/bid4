-- bid4 — the ledger: where the money actually is, at every moment.
--
-- Double entry, and nothing else. Every movement is a transaction whose entries
-- sum to zero, so the question "where did this leu come from" always has an
-- answer and the books cannot be half-written. There is no column anywhere that
-- somebody adds to and somebody else subtracts from.
--
-- Balances are derived from the entries and kept on the account as a copy,
-- updated inside the same transaction that writes them. The copy is what a page
-- reads; the entries are what it means. If the two ever disagree the entries are
-- right, which is why the copy is recomputable and the entries are immutable.
--
-- Nothing here is ever updated or deleted. A mistake is corrected by writing its
-- reverse, exactly as it would be on paper, because a ledger that can be edited
-- is a ledger that cannot be trusted to say what happened.

-- ---------------------------------------------------------------------------
-- accounts
-- ---------------------------------------------------------------------------

CREATE TABLE ledger_accounts (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What the account is for. One row per purpose per owner.
    --   USER_AVAILABLE   a seller's own money, withdrawable
    --   CAUSE_AVAILABLE  raised and not yet paid out to the organisation
    --   PLATFORM_ESCROW  paid by buyers, owed to nobody yet
    --   PLATFORM_REVENUE bid4's cut, which is the buyer's tax and only that
    --   PLATFORM_SHIPPING what the courier is owed, so revenue is not overstated
    --   EXTERNAL         the world outside: the card that paid, the bank that
    --                    was paid. It is what makes every entry have a
    --                    counterparty and is expected to run deeply negative.
    kind       varchar(24) NOT NULL,

    -- Null on the platform's own accounts, which are one each.
    owner_id   uuid,

    -- Materialised from the entries, in the same transaction that writes them.
    balance    bigint NOT NULL DEFAULT 0,

    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT ledger_accounts_kind_valid CHECK (kind IN (
        'USER_AVAILABLE', 'CAUSE_AVAILABLE', 'PLATFORM_ESCROW',
        'PLATFORM_REVENUE', 'PLATFORM_SHIPPING', 'EXTERNAL')),

    -- An owned account names its owner; a platform account has none.
    CONSTRAINT ledger_accounts_ownership CHECK (
        (kind IN ('USER_AVAILABLE', 'CAUSE_AVAILABLE') AND owner_id IS NOT NULL)
     OR (kind IN ('PLATFORM_ESCROW', 'PLATFORM_REVENUE', 'PLATFORM_SHIPPING', 'EXTERNAL')
         AND owner_id IS NULL)),

    -- Nobody's own money may go negative, and neither may escrow: paying out
    -- more than was paid in is the failure this table exists to make loud.
    -- EXTERNAL is the counterparty and is meant to run below zero.
    CONSTRAINT ledger_accounts_not_overdrawn CHECK (
        kind = 'EXTERNAL' OR balance >= 0)
);

CREATE UNIQUE INDEX ledger_accounts_owned_key
    ON ledger_accounts (kind, owner_id)
    WHERE owner_id IS NOT NULL;

CREATE UNIQUE INDEX ledger_accounts_platform_key
    ON ledger_accounts (kind)
    WHERE owner_id IS NULL;

-- The five that exist from the start, so nothing has to create them on a path
-- where money is already moving.
INSERT INTO ledger_accounts (kind) VALUES
    ('PLATFORM_ESCROW'), ('PLATFORM_REVENUE'), ('PLATFORM_SHIPPING'), ('EXTERNAL');

-- ---------------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------------

CREATE TABLE ledger_transactions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    kind            varchar(24) NOT NULL,
    order_id        uuid REFERENCES orders (id) ON DELETE RESTRICT,

    -- The whole of the retry story. A payment webhook delivered twice, a
    -- release job that ran again after a crash, a button pressed on two tabs:
    -- each carries the same key and the second one collides here rather than
    -- moving the money a second time.
    idempotency_key varchar(120) NOT NULL,

    memo            varchar(200),
    created_at      timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT ledger_transactions_kind_valid
        CHECK (kind IN ('PAYMENT', 'RELEASE', 'REFUND', 'PAYOUT', 'ADJUSTMENT'))
);

CREATE UNIQUE INDEX ledger_transactions_idempotency_key
    ON ledger_transactions (idempotency_key);

CREATE INDEX ledger_transactions_order_idx ON ledger_transactions (order_id)
    WHERE order_id IS NOT NULL;

CREATE INDEX ledger_transactions_at_idx ON ledger_transactions (created_at DESC);

-- ---------------------------------------------------------------------------
-- entries
-- ---------------------------------------------------------------------------

CREATE TABLE ledger_entries (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id uuid NOT NULL REFERENCES ledger_transactions (id) ON DELETE RESTRICT,
    account_id     uuid NOT NULL REFERENCES ledger_accounts (id)     ON DELETE RESTRICT,

    -- Signed, in bani. Positive is into the account, negative is out of it, and
    -- the entries of one transaction add to zero.
    amount         bigint NOT NULL,

    created_at     timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT ledger_entries_not_zero CHECK (amount <> 0)
);

CREATE INDEX ledger_entries_transaction_idx ON ledger_entries (transaction_id);

-- What a wallet page reads: this account's movements, newest first.
CREATE INDEX ledger_entries_account_idx ON ledger_entries (account_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- the invariant, in the database
-- ---------------------------------------------------------------------------
--
-- A service can be careful and a service can be wrong. This is the one rule the
-- whole design rests on, so it is checked where nothing can route around it:
-- deferred to the end of the transaction, because the entries of a movement are
-- necessarily unbalanced while they are still being written.

CREATE FUNCTION ledger_transaction_balances() RETURNS trigger AS $$
DECLARE
    total bigint;
BEGIN
    SELECT COALESCE(sum(amount), 0) INTO total
    FROM ledger_entries WHERE transaction_id = NEW.transaction_id;

    IF total <> 0 THEN
        RAISE EXCEPTION
            'Ledger transaction % does not balance: entries sum to %',
            NEW.transaction_id, total;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER ledger_entries_must_balance
    AFTER INSERT ON ledger_entries
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION ledger_transaction_balances();

-- Immutable, and said out loud rather than left to convention.
CREATE FUNCTION ledger_entries_are_final() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Ledger entries cannot be changed. Write the reverse instead.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_entries_no_edit
    BEFORE UPDATE OR DELETE ON ledger_entries
    FOR EACH ROW EXECUTE FUNCTION ledger_entries_are_final();

-- ---------------------------------------------------------------------------
-- the order's side of it
-- ---------------------------------------------------------------------------

-- What the buyer paid with, so a refund knows where to send it back and a
-- webhook can find the order it belongs to. No card details are ever stored.
ALTER TABLE orders
    ADD COLUMN payment_intent_id varchar(120),
    ADD COLUMN payment_session_id varchar(120);

CREATE UNIQUE INDEX orders_payment_intent_key ON orders (payment_intent_id)
    WHERE payment_intent_id IS NOT NULL;
CREATE UNIQUE INDEX orders_payment_session_key ON orders (payment_session_id)
    WHERE payment_session_id IS NOT NULL;
