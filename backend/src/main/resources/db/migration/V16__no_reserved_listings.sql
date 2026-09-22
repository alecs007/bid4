UPDATE auctions
SET status = 'LIVE',
    winner_id = NULL,
    accepted_bid_id = NULL,
    accepted_at = NULL
WHERE status = 'RESERVED';

INSERT INTO bids (auction_id, bidder_id, amount, status, created_at)
SELECT o.auction_id, o.buyer_id, o.final_price, 'ACCEPTED', o.created_at
FROM orders o
WHERE o.status NOT IN ('CANCELLED', 'REFUNDED')
  AND NOT EXISTS (
      SELECT 1 FROM bids b WHERE b.auction_id = o.auction_id AND b.bidder_id = o.buyer_id);

UPDATE bids b
SET status = 'ACCEPTED'
FROM orders o
WHERE o.auction_id = b.auction_id
  AND o.buyer_id = b.bidder_id
  AND o.status IN ('AWAITING_CONFIRMATION', 'AWAITING_PAYMENT', 'PAYMENT_FAILED')
  AND b.status <> 'ACCEPTED';

UPDATE auctions a
SET status = 'SOLD',
    winner_id = o.buyer_id,
    accepted_bid_id = b.id,
    accepted_at = COALESCE(o.paid_at, o.created_at),
    current_price = o.final_price,
    dispatch_deadline = COALESCE(o.paid_at, o.created_at) + INTERVAL '7 days'
FROM orders o
JOIN bids b ON b.auction_id = o.auction_id AND b.bidder_id = o.buyer_id
WHERE a.id = o.auction_id
  AND a.status <> 'SOLD'
  AND o.status NOT IN (
      'AWAITING_CONFIRMATION', 'AWAITING_PAYMENT', 'PAYMENT_FAILED', 'CANCELLED', 'REFUNDED');

UPDATE bids b
SET status = CASE WHEN b.id = a.accepted_bid_id THEN 'WON' ELSE 'LOST' END
FROM auctions a
WHERE a.id = b.auction_id
  AND a.status = 'SOLD';

UPDATE orders o
SET status = 'CANCELLED',
    confirmation_deadline = NULL
FROM auctions a
WHERE a.id = o.auction_id
  AND a.status = 'SOLD'
  AND o.buyer_id <> a.winner_id
  AND o.status IN ('AWAITING_CONFIRMATION', 'AWAITING_PAYMENT', 'PAYMENT_FAILED');

UPDATE auctions a
SET bid_count = (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id);
