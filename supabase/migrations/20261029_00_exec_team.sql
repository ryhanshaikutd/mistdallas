-- ─────────────────────────────────────────────────────────────────────────────
-- Handbook port, step 0 — 2026-10-29
--
-- Adds the Executive team. This file is deliberately alone: a new enum value
-- cannot be used in the same transaction that adds it, so run this file by
-- itself before 20261029_01_positions_seats.sql.
-- ─────────────────────────────────────────────────────────────────────────────
alter type team_type add value if not exists 'exec';
