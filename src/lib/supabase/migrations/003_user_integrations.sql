-- ============================================================
-- Migration: per-user integration credentials
-- Run AFTER 002_profiles.sql (requires set_updated_at function)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_integrations (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider    TEXT    NOT NULL,   -- 'trello', 'ical', 'google_calendar', etc.
  credentials JSONB   NOT NULL DEFAULT '{}',
  enabled     BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_integrations"
  ON user_integrations FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE TRIGGER user_integrations_updated_at
  BEFORE UPDATE ON user_integrations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
