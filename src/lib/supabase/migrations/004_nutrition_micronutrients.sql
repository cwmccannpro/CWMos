-- ============================================================
-- Migration: add micronutrient columns to nutrition tables
-- ============================================================

ALTER TABLE nutrition_logs
  ADD COLUMN IF NOT EXISTS cholesterol_mg    NUMERIC,
  ADD COLUMN IF NOT EXISTS saturated_fat_g   NUMERIC,
  ADD COLUMN IF NOT EXISTS trans_fat_g       NUMERIC,
  ADD COLUMN IF NOT EXISTS potassium_mg      NUMERIC,
  ADD COLUMN IF NOT EXISTS calcium_mg        NUMERIC,
  ADD COLUMN IF NOT EXISTS iron_mg           NUMERIC,
  ADD COLUMN IF NOT EXISTS vitamin_c_mg      NUMERIC,
  ADD COLUMN IF NOT EXISTS vitamin_d_mcg     NUMERIC;

ALTER TABLE nutrition_log_items
  ADD COLUMN IF NOT EXISTS cholesterol_mg    NUMERIC,
  ADD COLUMN IF NOT EXISTS saturated_fat_g   NUMERIC,
  ADD COLUMN IF NOT EXISTS trans_fat_g       NUMERIC,
  ADD COLUMN IF NOT EXISTS potassium_mg      NUMERIC,
  ADD COLUMN IF NOT EXISTS calcium_mg        NUMERIC,
  ADD COLUMN IF NOT EXISTS iron_mg           NUMERIC,
  ADD COLUMN IF NOT EXISTS vitamin_c_mg      NUMERIC,
  ADD COLUMN IF NOT EXISTS vitamin_d_mcg     NUMERIC;
