-- Integrity rules that Prisma's schema language cannot express (ERD §4.2, ADR-0004).
-- These are the database's last line of defence: they hold even if application code has a bug.

-- CHECK constraints --------------------------------------------------------------------------
ALTER TABLE vehicles        ADD CONSTRAINT vehicles_capacity_check        CHECK (capacity BETWEEN 1 AND 6);
ALTER TABLE driver_profiles ADD CONSTRAINT driver_profiles_online_zone_check
                                CHECK (availability = 'OFFLINE' OR current_zone_code IS NOT NULL);
ALTER TABLE zone_distances  ADD CONSTRAINT zone_distances_valid_check     CHECK (from_zone_code <> to_zone_code AND distance_m > 0);
ALTER TABLE zone_adjacency  ADD CONSTRAINT zone_adjacency_no_self_check   CHECK (zone_code <> adjacent_zone_code);

ALTER TABLE ride_requests
  ADD CONSTRAINT ride_requests_seats_check          CHECK (seats BETWEEN 1 AND 6),
  ADD CONSTRAINT ride_requests_distinct_zones_check CHECK (pickup_zone_code <> destination_zone_code),
  ADD CONSTRAINT ride_requests_estimate_check       CHECK (estimated_fare_paisa >= 0),
  ADD CONSTRAINT ride_requests_same_gender_check    CHECK (NOT same_gender_only OR pool_opt_in);               -- FR-PAX-11

ALTER TABLE pools
  ADD CONSTRAINT pools_capacity_check       CHECK (capacity BETWEEN 1 AND 6),
  ADD CONSTRAINT pools_occupied_seats_check CHECK (occupied_seats >= 0 AND occupied_seats <= capacity);  -- FR-POOL-02

ALTER TABLE pool_members ADD CONSTRAINT pool_members_seats_check CHECK (seats >= 1);

ALTER TABLE fares ADD CONSTRAINT fares_amounts_check CHECK (
  base_paisa >= 0 AND distance_m >= 0 AND per_km_paisa >= 0 AND distance_charge_paisa >= 0
  AND discount_bps BETWEEN 0 AND 10000 AND discount_paisa BETWEEN 0 AND distance_charge_paisa
  AND seats >= 1 AND total_paisa >= 0);

ALTER TABLE payments ADD CONSTRAINT payments_amount_check CHECK (amount_paisa > 0);
ALTER TABLE wallets  ADD CONSTRAINT wallets_balance_check CHECK (balance_paisa >= 0);                    -- FR-PAY-06
ALTER TABLE wallet_transactions
  ADD CONSTRAINT wallet_tx_sign_check          CHECK ((type = 'TOPUP' AND amount_paisa > 0) OR (type <> 'TOPUP' AND amount_paisa < 0)),
  ADD CONSTRAINT wallet_tx_balance_after_check CHECK (balance_after_paisa >= 0);

-- Partial unique indexes (business invariants) -----------------------------------------------
CREATE UNIQUE INDEX ride_requests_one_active_per_passenger
  ON ride_requests (passenger_id) WHERE status IN ('REQUESTED', 'MATCHED', 'DRIVER_ARRIVED', 'STARTED'); -- BR-05
CREATE UNIQUE INDEX pools_one_active_per_driver
  ON pools (driver_id) WHERE status IN ('OPEN', 'DRIVER_ARRIVED', 'STARTED');                             -- BR-04
CREATE UNIQUE INDEX pool_members_one_active_membership
  ON pool_members (ride_request_id) WHERE left_at IS NULL;                                                 -- FR-POOL-09

-- Partial performance indexes ----------------------------------------------------------------
CREATE INDEX ride_requests_open_feed ON ride_requests (pickup_zone_code, requested_at) WHERE status = 'REQUESTED';
CREATE INDEX ride_requests_expiry    ON ride_requests (expires_at)                    WHERE status = 'REQUESTED';

-- Append-only audit trail and ledger ---------------------------------------------------------
CREATE FUNCTION forbid_update_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END $$;

CREATE TRIGGER status_history_append_only      BEFORE UPDATE OR DELETE ON status_history
  FOR EACH ROW EXECUTE FUNCTION forbid_update_delete();                                                    -- FR-HIST-02
CREATE TRIGGER wallet_transactions_append_only BEFORE UPDATE OR DELETE ON wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION forbid_update_delete();                                                    -- NFR-CON-05
