DROP INDEX orders_one_open_per_auction;

CREATE UNIQUE INDEX orders_one_open_per_buyer
    ON orders (auction_id, buyer_id)
    WHERE status NOT IN ('CANCELLED', 'REFUNDED');

CREATE UNIQUE INDEX orders_one_paid_per_auction
    ON orders (auction_id)
    WHERE status NOT IN (
        'AWAITING_CONFIRMATION', 'AWAITING_PAYMENT', 'PAYMENT_FAILED', 'CANCELLED', 'REFUNDED');
