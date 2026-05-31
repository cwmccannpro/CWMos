-- 008_outreach_agent.sql
-- Outreach email agent: state tracking and run history

CREATE TABLE IF NOT EXISTS outreach_agent (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled         BOOLEAN NOT NULL DEFAULT false,
  daily_limit     INTEGER NOT NULL DEFAULT 10,
  batch_size      INTEGER NOT NULL DEFAULT 2,
  emails_today    INTEGER NOT NULL DEFAULT 0,
  last_reset_date DATE    NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS outreach_runs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emails_sent  INTEGER NOT NULL DEFAULT 0,
  leads_found  INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'running', -- running | completed | error
  notes        TEXT,
  started_at   TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Trigger to keep updated_at fresh on outreach_agent
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER outreach_agent_updated_at BEFORE UPDATE ON outreach_agent
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE outreach_agent ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_runs  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own outreach agent" ON outreach_agent FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own outreach runs"  ON outreach_runs  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Atomic increment with daily reset (called by the Python agent)
CREATE OR REPLACE FUNCTION increment_outreach_emails(p_user_id UUID, p_count INTEGER)
RETURNS TABLE (emails_today INTEGER, daily_limit INTEGER, can_send BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE v outreach_agent%ROWTYPE;
BEGIN
  -- Reset counter if it's a new day
  UPDATE outreach_agent
  SET emails_today    = CASE WHEN last_reset_date < CURRENT_DATE THEN 0 ELSE emails_today END,
      last_reset_date = CURRENT_DATE,
      updated_at      = now()
  WHERE user_id = p_user_id;

  -- Increment and return new state
  UPDATE outreach_agent
  SET emails_today = emails_today + p_count,
      updated_at   = now()
  WHERE user_id = p_user_id AND enabled = true
  RETURNING * INTO v;

  IF v IS NULL THEN
    SELECT a.emails_today, a.daily_limit INTO v.emails_today, v.daily_limit
    FROM outreach_agent a WHERE a.user_id = p_user_id;
  END IF;

  RETURN QUERY SELECT v.emails_today, v.daily_limit, (v.emails_today <= v.daily_limit);
END;
$$;
