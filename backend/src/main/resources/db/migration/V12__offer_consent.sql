-- What a bidder accepted, at the moment they offered.
--
-- The same principle as order_agreements (V11): an acceptance is evidence only
-- if it names which text was accepted and when. The difference is where it
-- lives. An offer has no order yet -- one is opened only if the seller takes it
-- -- so the acceptance rides on the bid, which is the act being consented to.
--
-- Nullable, because offers placed before this gate existed have no version to
-- name, and inventing one for them would be inventing evidence. Every offer
-- written from here on carries both columns; the service refuses one that does
-- not name the current version.
--
-- A replaced or retracted offer is deleted, and its acceptance goes with it.
-- That is correct: what it was evidence of no longer exists, and the offer now
-- standing carries its own.

ALTER TABLE bids
    ADD COLUMN terms_version     varchar(32),
    ADD COLUMN terms_accepted_at timestamptz;
