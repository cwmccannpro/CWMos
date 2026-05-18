-- ============================================================
-- Migration: nutrition tracking tables
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Main meal log
CREATE TABLE IF NOT EXISTS nutrition_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_at       TIMESTAMPTZ NOT NULL,
  meal_type       TEXT        NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack','unknown')),
  description     TEXT,
  total_calories  NUMERIC,
  protein_g       NUMERIC,
  carbs_g         NUMERIC,
  fat_g           NUMERIC,
  fiber_g         NUMERIC,
  sugar_g         NUMERIC,
  sodium_mg       NUMERIC,
  source          TEXT        DEFAULT 'chatgpt',
  confidence      NUMERIC     CHECK (confidence >= 0 AND confidence <= 1),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
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

-- ── Row-level security ────────────────────────────────────────────────────────
ALTER TABLE nutrition_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_log_items ENABLE ROW LEVEL SECURITY;

-- Authenticated users can only read/write their own rows.
-- The service role key (used by the ChatGPT API endpoint) bypasses RLS automatically.
CREATE POLICY "users_own_logs"
  ON nutrition_logs FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Items are accessible when their parent log belongs to the user.
CREATE POLICY "users_own_log_items"
  ON nutrition_log_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nutrition_logs
      WHERE nutrition_logs.id = nutrition_log_items.log_id
        AND nutrition_logs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM nutrition_logs
      WHERE nutrition_logs.id = nutrition_log_items.log_id
        AND nutrition_logs.user_id = auth.uid()
    )
  );
