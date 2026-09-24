-- Payments get their own audit rows (FR-DRV-10: collecting cash is audited; FR-HIST-04: how each
-- charge was paid), kept apart from the ride timeline.
-- AlterEnum
ALTER TYPE "audit_entity" ADD VALUE 'PAYMENT';
