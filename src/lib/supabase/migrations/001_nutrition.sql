-- ============================================================
-- Migration: nutrition tracking tables
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Main meal log
CREATE TABLE IF NOT EXISTS nutrition_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT        NOT NULL DEFAULT 'default',
  logged_at     TIMESTAMPTZ NOT NULL,
  meal_type     TEXT        NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack','unknown')),
  description   TEXT,
  total_calories  NUMERIC,
  protein_g       NUMERIC,
  carbs_g         NUMERIC,
  fat_g           NUMERIC,
  fiber_g         NUMERIC,
  sugar_g         NUMERIC,
  sodium_mg       NUMERIC,
  source        TEXT        DEFAULT 'chatgpt',
  confidence    NUMERIC     CHECK (confidence >= 0 AND confidence <= 1),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Individual food items within each log
CREATE TABLE IF NOT EXISTS nutrition_log_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id      UUID        NOT NULL REFERENCES nutrition_logs(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  quantity    TEXT,
  calories    NUMERIC,
  protein_g   NUMERIC,
  carbs_g     NUMERIC,
  fat_g       NUMERIC,
  fiber_g     NUMERIC,
  sugar_g     NUMERIC,
  sodium_mg   NUMERIC,
  confidence  NUMERIC     CHECK (confidence >= 0 AND confidence <= 1),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_logged_at
  ON nutrition_logs (user_id, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_nutrition_log_items_log_id
  ON nutrition_log_items (log_id);

-- Row-level security: allow service-role key full access (default for service role)
ALTER TABLE nutrition_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_log_items ENABLE ROW LEVEL SECURITY;

-- Policy: service role bypasses RLS automatically, so this only applies to anon/user roles
CREATE POLICY "service_role_full_access_logs"
  ON nutrition_logs FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_full_access_items"
  ON nutrition_log_items FOR ALL
  USING (true)
  WITH CHECK (true);
