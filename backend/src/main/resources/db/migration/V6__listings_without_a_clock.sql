-- Listings no longer close on a timer.
--
-- A listing stays open until its seller accepts one of the offers on it or takes it down, so every
-- column that existed to measure a deadline goes, and with them the statuses only a deadline could
-- produce. What replaces them is the acceptance itself: which offer was taken, when, and — once the
-- money has arrived — when the parcel is late.

-- 1. Statuses, while the old values are still legal.
--
-- SCHEDULED meant "published, starting later", and nothing is published into the future any more.
-- ENDED and UNSOLD both meant "the clock ran out", which is no longer something that happens to a
-- listing; withdrawn is the honest reading of one that stopped without a buyer.
ALTER TABLE auctions DROP CONSTRAINT auctions_status_valid;
ALTER TABLE auctions DROP CONSTRAINT auctions_winner_settled;

UPDATE auctions SET status = 'LIVE' WHERE status = 'SCHEDULED';
UPDATE auctions SET status = 'CANCELLED' WHERE status IN ('ENDED', 'UNSOLD');

-- A listing that was waiting to start is now already up, so neither date on it can stay in the
-- future: "publicat in two days" is the sort of thing a reader notices and nobody can explain.
-- Both columns, because the card reads created_at and the listing page reads start_time.
UPDATE auctions SET start_time = now() WHERE start_time > now();
UPDATE auctions SET created_at = now() WHERE created_at > now();

-- 2. The acceptance.
ALTER TABLE auctions ADD COLUMN accepted_bid_id UUID;
ALTER TABLE auctions ADD COLUMN accepted_at TIMESTAMPTZ;
ALTER TABLE auctions ADD COLUMN dispatch_deadline TIMESTAMPTZ;

-- A listing that had already sold keeps its winner, and the acceptance is backfilled from the bid
-- that won it, so old rows read the way new ones will.
UPDATE auctions a
SET accepted_bid_id = b.id,
    accepted_at = a.updated_at
FROM bids b
WHERE b.auction_id = a.id
  AND b.bidder_id = a.winner_id
  AND a.status = 'SOLD'
  AND a.winner_id IS NOT NULL;

-- Anything that claimed a winner without a matching bid cannot satisfy the new rule; a sale with no
-- offer behind it was never coherent.
UPDATE auctions
SET winner_id = NULL, status = 'CANCELLED'
WHERE winner_id IS NOT NULL AND accepted_bid_id IS NULL;

-- 3. The clock's own columns and the constraints that policed them.
ALTER TABLE auctions DROP CONSTRAINT auctions_window;
ALTER TABLE auctions DROP CONSTRAINT auctions_anti_snipe_range;
ALTER TABLE auctions DROP CONSTRAINT auctions_counters_positive;
ALTER TABLE auctions DROP CONSTRAINT auctions_increment_min;

DROP INDEX auctions_status_end_time_idx;
DROP INDEX auctions_live_category_idx;

ALTER TABLE auctions DROP COLUMN end_time;
ALTER TABLE auctions DROP COLUMN anti_snipe_seconds;
ALTER TABLE auctions DROP COLUMN extension_count;

-- The flag on a bid that pushed a closing time out. There are no closing times to push.
ALTER TABLE bids DROP COLUMN triggered_extension;

-- 4. The rules that replace them.
ALTER TABLE auctions
  ADD CONSTRAINT auctions_status_valid
  CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'LIVE', 'RESERVED', 'SOLD', 'CANCELLED'));

ALTER TABLE auctions
  ADD CONSTRAINT auctions_counters_positive
  CHECK (bid_count >= 0 AND watcher_count >= 0);

-- A buyer and an accepted offer travel together, in both directions. RESERVED counts: the buyer is
-- named the moment their offer is taken, before they have paid for it.
ALTER TABLE auctions
  ADD CONSTRAINT auctions_winner_settled
  CHECK (
    (status IN ('RESERVED', 'SOLD') AND winner_id IS NOT NULL AND accepted_bid_id IS NOT NULL)
    OR (status NOT IN ('RESERVED', 'SOLD') AND winner_id IS NULL AND accepted_bid_id IS NULL)
  );

-- The accepted offer has to be an offer, and deleting one out from under a sale is not allowed.
ALTER TABLE auctions
  ADD CONSTRAINT auctions_accepted_bid_fk
  FOREIGN KEY (accepted_bid_id) REFERENCES bids (id);

-- The dispatch clock starts when the money arrives, so it belongs only to a paid listing.
ALTER TABLE auctions
  ADD CONSTRAINT auctions_dispatch_after_payment
  CHECK (dispatch_deadline IS NULL OR status = 'SOLD');

-- 5. Bids gain the state an acceptance puts them in.
ALTER TABLE bids DROP CONSTRAINT bids_status_valid;
ALTER TABLE bids
  ADD CONSTRAINT bids_status_valid
  CHECK (status IN ('ACTIVE', 'OUTBID', 'WINNING', 'ACCEPTED', 'WON', 'LOST'));

-- 6. Indexes for how the catalogue is read now: newest first, and the seller's own overdue parcels.
CREATE INDEX auctions_live_category_idx ON auctions (category, created_at DESC)
    WHERE status = 'LIVE';
CREATE INDEX auctions_status_created_at_idx ON auctions (status, created_at DESC);
CREATE INDEX auctions_dispatch_deadline_idx ON auctions (dispatch_deadline)
    WHERE dispatch_deadline IS NOT NULL;
