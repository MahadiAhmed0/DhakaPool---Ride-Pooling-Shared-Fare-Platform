-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('PASSENGER', 'DRIVER');

-- CreateEnum
CREATE TYPE "gender" AS ENUM ('FEMALE', 'MALE', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "gender_restriction" AS ENUM ('NONE', 'FEMALE_ONLY', 'MALE_ONLY');

-- CreateEnum
CREATE TYPE "driver_availability" AS ENUM ('ONLINE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "ride_status" AS ENUM ('REQUESTED', 'MATCHED', 'DRIVER_ARRIVED', 'STARTED', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "pool_status" AS ENUM ('OPEN', 'DRIVER_ARRIVED', 'STARTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('CASH', 'TESLAPAY');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('PENDING_CASH', 'PAID', 'UNPAID');

-- CreateEnum
CREATE TYPE "charge_type" AS ENUM ('RIDE', 'CANCELLATION_FEE');

-- CreateEnum
CREATE TYPE "wallet_txn_type" AS ENUM ('TOPUP', 'RIDE_PAYMENT', 'CANCELLATION_FEE');

-- CreateEnum
CREATE TYPE "audit_entity" AS ENUM ('RIDE_REQUEST', 'POOL', 'DRIVER');

-- CreateEnum
CREATE TYPE "actor_role" AS ENUM ('PASSENGER', 'DRIVER', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "full_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "password_hash" VARCHAR(100) NOT NULL,
    "role" "user_role" NOT NULL,
    "gender" "gender" NOT NULL DEFAULT 'PREFER_NOT_TO_SAY',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_profiles" (
    "user_id" UUID NOT NULL,
    "availability" "driver_availability" NOT NULL DEFAULT 'OFFLINE',
    "current_zone_code" VARCHAR(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "driver_id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "plate" VARCHAR(20) NOT NULL,
    "capacity" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "code" VARCHAR(3) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "zone_distances" (
    "from_zone_code" VARCHAR(3) NOT NULL,
    "to_zone_code" VARCHAR(3) NOT NULL,
    "distance_m" INTEGER NOT NULL,

    CONSTRAINT "zone_distances_pkey" PRIMARY KEY ("from_zone_code","to_zone_code")
);

-- CreateTable
CREATE TABLE "zone_adjacency" (
    "zone_code" VARCHAR(3) NOT NULL,
    "adjacent_zone_code" VARCHAR(3) NOT NULL,

    CONSTRAINT "zone_adjacency_pkey" PRIMARY KEY ("zone_code","adjacent_zone_code")
);

-- CreateTable
CREATE TABLE "ride_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "passenger_id" UUID NOT NULL,
    "pickup_zone_code" VARCHAR(3) NOT NULL,
    "destination_zone_code" VARCHAR(3) NOT NULL,
    "seats" SMALLINT NOT NULL,
    "pool_opt_in" BOOLEAN NOT NULL DEFAULT true,
    "same_gender_only" BOOLEAN NOT NULL DEFAULT false,
    "payment_method" "payment_method" NOT NULL,
    "status" "ride_status" NOT NULL DEFAULT 'REQUESTED',
    "estimated_fare_paisa" BIGINT NOT NULL,
    "requested_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "cancel_reason" VARCHAR(40),
    "cancelled_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ride_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pools" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "driver_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "pickup_zone_code" VARCHAR(3) NOT NULL,
    "status" "pool_status" NOT NULL DEFAULT 'OPEN',
    "capacity" SMALLINT NOT NULL,
    "occupied_seats" SMALLINT NOT NULL DEFAULT 0,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "gender_restriction" "gender_restriction" NOT NULL DEFAULT 'NONE',
    "cancel_reason" VARCHAR(40),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arrived_at" TIMESTAMPTZ(3),
    "started_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pool_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pool_id" UUID NOT NULL,
    "ride_request_id" UUID NOT NULL,
    "seats" SMALLINT NOT NULL,
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMPTZ(3),
    "dropoff_order" SMALLINT,
    "dropped_off_at" TIMESTAMPTZ(3),

    CONSTRAINT "pool_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fares" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ride_request_id" UUID NOT NULL,
    "type" "charge_type" NOT NULL,
    "base_paisa" INTEGER NOT NULL,
    "distance_m" INTEGER NOT NULL,
    "per_km_paisa" INTEGER NOT NULL,
    "distance_charge_paisa" BIGINT NOT NULL,
    "discount_bps" INTEGER NOT NULL,
    "discount_paisa" BIGINT NOT NULL,
    "seats" SMALLINT NOT NULL,
    "pooled" BOOLEAN NOT NULL,
    "total_paisa" BIGINT NOT NULL,
    "locked_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fare_id" UUID NOT NULL,
    "ride_request_id" UUID NOT NULL,
    "method" "payment_method" NOT NULL,
    "status" "payment_status" NOT NULL,
    "amount_paisa" BIGINT NOT NULL,
    "wallet_transaction_id" UUID,
    "collected_by_id" UUID,
    "paid_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "passenger_id" UUID NOT NULL,
    "balance_paisa" BIGINT NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wallet_id" UUID NOT NULL,
    "type" "wallet_txn_type" NOT NULL,
    "amount_paisa" BIGINT NOT NULL,
    "balance_after_paisa" BIGINT NOT NULL,
    "ride_request_id" UUID,
    "reason" VARCHAR(40),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_history" (
    "id" BIGSERIAL NOT NULL,
    "entity_type" "audit_entity" NOT NULL,
    "entity_id" UUID NOT NULL,
    "from_status" VARCHAR(20),
    "to_status" VARCHAR(20) NOT NULL,
    "actor_user_id" UUID,
    "actor_role" "actor_role" NOT NULL,
    "reason" VARCHAR(40),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_driver_id_key" ON "vehicles"("driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_plate_key" ON "vehicles"("plate");

-- CreateIndex
CREATE INDEX "ride_requests_passenger_id_created_at_idx" ON "ride_requests"("passenger_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "pools_driver_id_created_at_idx" ON "pools"("driver_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "pool_members_ride_request_id_idx" ON "pool_members"("ride_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "pool_members_pool_id_ride_request_id_key" ON "pool_members"("pool_id", "ride_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "fares_ride_request_id_type_key" ON "fares"("ride_request_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "payments_fare_id_key" ON "payments"("fare_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_wallet_transaction_id_key" ON "payments"("wallet_transaction_id");

-- CreateIndex
CREATE INDEX "payments_ride_request_id_idx" ON "payments"("ride_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_passenger_id_key" ON "wallets"("passenger_id");

-- CreateIndex
CREATE INDEX "wallet_transactions_wallet_id_created_at_idx" ON "wallet_transactions"("wallet_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "status_history_entity_type_entity_id_created_at_idx" ON "status_history"("entity_type", "entity_id", "created_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_current_zone_code_fkey" FOREIGN KEY ("current_zone_code") REFERENCES "zones"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "driver_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_distances" ADD CONSTRAINT "zone_distances_from_zone_code_fkey" FOREIGN KEY ("from_zone_code") REFERENCES "zones"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_distances" ADD CONSTRAINT "zone_distances_to_zone_code_fkey" FOREIGN KEY ("to_zone_code") REFERENCES "zones"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_adjacency" ADD CONSTRAINT "zone_adjacency_zone_code_fkey" FOREIGN KEY ("zone_code") REFERENCES "zones"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_adjacency" ADD CONSTRAINT "zone_adjacency_adjacent_zone_code_fkey" FOREIGN KEY ("adjacent_zone_code") REFERENCES "zones"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_requests" ADD CONSTRAINT "ride_requests_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_requests" ADD CONSTRAINT "ride_requests_pickup_zone_code_fkey" FOREIGN KEY ("pickup_zone_code") REFERENCES "zones"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_requests" ADD CONSTRAINT "ride_requests_destination_zone_code_fkey" FOREIGN KEY ("destination_zone_code") REFERENCES "zones"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pools" ADD CONSTRAINT "pools_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "driver_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pools" ADD CONSTRAINT "pools_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pools" ADD CONSTRAINT "pools_pickup_zone_code_fkey" FOREIGN KEY ("pickup_zone_code") REFERENCES "zones"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_members" ADD CONSTRAINT "pool_members_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_members" ADD CONSTRAINT "pool_members_ride_request_id_fkey" FOREIGN KEY ("ride_request_id") REFERENCES "ride_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fares" ADD CONSTRAINT "fares_ride_request_id_fkey" FOREIGN KEY ("ride_request_id") REFERENCES "ride_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_fare_id_fkey" FOREIGN KEY ("fare_id") REFERENCES "fares"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_ride_request_id_fkey" FOREIGN KEY ("ride_request_id") REFERENCES "ride_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_wallet_transaction_id_fkey" FOREIGN KEY ("wallet_transaction_id") REFERENCES "wallet_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_collected_by_id_fkey" FOREIGN KEY ("collected_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_ride_request_id_fkey" FOREIGN KEY ("ride_request_id") REFERENCES "ride_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
