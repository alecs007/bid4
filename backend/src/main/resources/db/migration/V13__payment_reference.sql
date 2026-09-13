-- Which checkout a sale was paid through.
--
-- A provider's webhook names its own session, not our order, so without this
-- there is nothing to match a callback back to and a payment can only be
-- believed rather than checked. It is also the one string support can quote to
-- a provider when a buyer says they were charged and the sale says otherwise.
--
-- Nullable: sales opened before a provider existed have no session, and the
-- stub gateway's reference is not one anybody can look up.
ALTER TABLE orders
    ADD COLUMN payment_reference varchar(128),
    ADD COLUMN payment_provider  varchar(32);

-- One sale per checkout session. A callback that arrives twice, or a session
-- somehow reused, must not be able to pay for two orders.
CREATE UNIQUE INDEX orders_by_payment_reference
    ON orders (payment_reference)
    WHERE payment_reference IS NOT NULL;
