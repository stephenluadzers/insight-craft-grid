-- Add configuration column to workflows and nodes
ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS category TEXT;

-- Create workflow schedules table
CREATE TABLE IF NOT EXISTS workflow_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  cron_expression TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE workflow_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view schedules in their workspaces"
  ON workflow_schedules FOR SELECT
  USING (
    workflow_id IN (
      SELECT id FROM workflows
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Editors can manage schedules"
  ON workflow_schedules FOR ALL
  USING (
    workflow_id IN (
      SELECT id FROM workflows
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'editor')
      )
    )
  );

-- Create webhook triggers table
CREATE TABLE IF NOT EXISTS workflow_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  webhook_key TEXT NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_triggered_at TIMESTAMPTZ
);

ALTER TABLE workflow_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view webhooks in their workspaces"
  ON workflow_webhooks FOR SELECT
  USING (
    workflow_id IN (
      SELECT id FROM workflows
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Editors can manage webhooks"
  ON workflow_webhooks FOR ALL
  USING (
    workflow_id IN (
      SELECT id FROM workflows
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'editor')
      )
    )
  );

-- Create workflow templates table
CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  nodes JSONB NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  use_count INTEGER DEFAULT 0
);

ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public templates are viewable by everyone"
  ON workflow_templates FOR SELECT
  USING (is_public = TRUE OR created_by = auth.uid());

CREATE POLICY "Users can create templates"
  ON workflow_templates FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own templates"
  ON workflow_templates FOR UPDATE
  USING (created_by = auth.uid());

-- Add trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_workflow_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_update_workflow_schedules_updated_at
  BEFORE UPDATE ON workflow_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_schedules_updated_at();