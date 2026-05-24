-- ============================================================
-- Migration: per-user dashboard layout persistence
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_dashboard_layouts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  layout     JSONB       NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_dashboard_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own layout" ON user_dashboard_layouts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own layout" ON user_dashboard_layouts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Reuse the existing updated_at trigger function from 002_profiles.sql
CREATE TRIGGER update_user_dashboard_layouts_updated_at
  BEFORE UPDATE ON user_dashboard_layouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
