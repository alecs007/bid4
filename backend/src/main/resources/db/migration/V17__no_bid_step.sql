ALTER TABLE auctions
    DROP CONSTRAINT auctions_increment_min,
    DROP COLUMN bid_increment;
