-- Runs once, when the database volume is first created.
-- A separate database for automated tests, so tests never touch development data (ADR-0011).
CREATE DATABASE dhakapool_test;
