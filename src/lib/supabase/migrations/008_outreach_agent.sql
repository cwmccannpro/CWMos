-- 008_outreach_agent.sql
-- Outreach email agent: state tracking and run history

CREATE TABLE IF NOT EXISTS outreach_agent (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled      BOOLEAN NOT NULL DEFAULT false,
  daily_limit  INTEGER NOT NULL DEFAULT 10,
  sends_today  INTEGER NOT NULL DEFAULT 0,
  last_reset   DATE    NOT NULL DEFAULT CURRENT_DATE,
  niches       JSONB   NOT NULL DEFAULT '[
    {"niche":"roofing contractor","city":"Bridgeport","state":"CT"},
    {"niche":"septic service","city":"Waterbury","state":"CT"},
    {"niche":"appliance repair","city":"Hartford","state":"CT"}
  ]'::jsonb,
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- One row per email sent or pipeline run
CREATE TABLE IF NOT EXISTS outreach_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_at          TIMESTAMPTZ DEFAULT now(),
  action          TEXT,          -- 'email_sent' | 'pipeline_run'
  lead_name       TEXT,
  lead_email      TEXT,
  niche           TEXT,
  city            TEXT,
  claude_cost_usd NUMERIC(8,5)  DEFAULT 0,
  emails_sent     INTEGER       DEFAULT 0
);

CREATE INDEX IF NOT EXISTS outreach_runs_user_date ON outreach_runs(user_id, run_at DESC);

-- Trigger to keep updated_at fresh
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

-- Atomic increment (matches Python agent's call: increment_sends_today)
CREATE OR REPLACE FUNCTION increment_sends_today(p_user_id UUID, p_count INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE outreach_agent
  SET sends_today = sends_today + p_count,
      updated_at  = now()
  WHERE user_id = p_user_id;
END;
$$;
