-- 007_project_boards.sql
-- Project Boards module: kanban projects, columns, cards, checklists, comments

CREATE TABLE IF NOT EXISTS board_projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT DEFAULT '#00D4FF',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS board_columns (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES board_projects(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS board_cards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id   UUID NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
  project_id  UUID NOT NULL REFERENCES board_projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  priority    TEXT DEFAULT 'medium', -- low | medium | high | urgent
  due_date    DATE,
  tags        TEXT[] DEFAULT '{}',
  assignee    TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  archived    BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS card_checklist_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id    UUID NOT NULL REFERENCES board_cards(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  checked    BOOLEAN DEFAULT false,
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS card_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id    UUID NOT NULL REFERENCES board_cards(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER board_projects_updated_at BEFORE UPDATE ON board_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER board_cards_updated_at BEFORE UPDATE ON board_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row-level security
ALTER TABLE board_projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_columns          ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_cards            ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_checklist_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_comments          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own projects"   ON board_projects       FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own columns"    ON board_columns         FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own cards"      ON board_cards           FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own checklist"  ON card_checklist_items  FOR ALL USING (
  auth.uid() = (SELECT user_id FROM board_cards WHERE id = card_id)
);
CREATE POLICY "Users manage own comments"   ON card_comments         FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
