-- Create credentials table for secure API key storage
CREATE TABLE IF NOT EXISTS public.workflow_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'api_key', 'oauth', 'basic_auth', etc.
  encrypted_data JSONB NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(workspace_id, name)
);

-- Create detailed execution logs table
CREATE TABLE IF NOT EXISTS public.workflow_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'running', 'success', 'error', 'skipped'
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  retry_count INTEGER DEFAULT 0
);

-- Create integration templates table
CREATE TABLE IF NOT EXISTS public.integration_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- 'communication', 'data', 'ai', 'productivity', etc.
  icon TEXT,
  description TEXT,
  config_schema JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for credentials
CREATE POLICY "Users can view credentials in their workspaces"
  ON public.workflow_credentials FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Editors can manage credentials"
  ON public.workflow_credentials FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin', 'editor')
  ));

-- RLS Policies for execution logs
CREATE POLICY "Users can view execution logs in their workspaces"
  ON public.workflow_execution_logs FOR SELECT
  USING (execution_id IN (
    SELECT id FROM public.workflow_executions
    WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "System can insert execution logs"
  ON public.workflow_execution_logs FOR INSERT
  WITH CHECK (execution_id IN (
    SELECT id FROM public.workflow_executions
    WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  ));

-- RLS Policies for integration templates (public read)
CREATE POLICY "Anyone can view active integration templates"
  ON public.integration_templates FOR SELECT
  USING (is_active = true);

-- Insert some default integration templates
INSERT INTO public.integration_templates (name, category, icon, description, config_schema) VALUES
  ('Email (Resend)', 'communication', 'Mail', 'Send emails via Resend', '{"apiKey": {"type": "credential", "required": true}, "from": {"type": "string", "required": true}, "to": {"type": "string", "required": true}, "subject": {"type": "string", "required": true}, "body": {"type": "text", "required": true}}'),
  ('Slack', 'communication', 'MessageSquare', 'Send messages to Slack', '{"webhookUrl": {"type": "credential", "required": true}, "channel": {"type": "string", "required": false}, "message": {"type": "text", "required": true}}'),
  ('HTTP Request', 'data', 'Globe', 'Make HTTP API calls', '{"method": {"type": "select", "options": ["GET", "POST", "PUT", "DELETE", "PATCH"], "required": true}, "url": {"type": "string", "required": true}, "headers": {"type": "json", "required": false}, "body": {"type": "json", "required": false}}'),
  ('OpenAI', 'ai', 'Brain', 'Use OpenAI GPT models', '{"apiKey": {"type": "credential", "required": true}, "model": {"type": "select", "options": ["gpt-4", "gpt-3.5-turbo"], "required": true}, "prompt": {"type": "text", "required": true}}'),
  ('Webhook', 'data', 'Webhook', 'Trigger external webhooks', '{"url": {"type": "string", "required": true}, "method": {"type": "select", "options": ["POST", "GET"], "required": true}, "payload": {"type": "json", "required": false}}'),
  ('Data Transform', 'data', 'RefreshCw', 'Transform and filter data', '{"operation": {"type": "select", "options": ["map", "filter", "reduce"], "required": true}, "expression": {"type": "text", "required": true}}'),
  ('Condition', 'logic', 'GitBranch', 'Branch workflow based on conditions', '{"field": {"type": "string", "required": true}, "operator": {"type": "select", "options": ["equals", "not_equals", "contains", "greater_than", "less_than"], "required": true}, "value": {"type": "string", "required": true}}'),
  ('Delay', 'utility', 'Clock', 'Wait for a specified time', '{"duration": {"type": "number", "required": true}, "unit": {"type": "select", "options": ["seconds", "minutes", "hours"], "required": true}}')
ON CONFLICT (name) DO NOTHING;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workflow_credentials_updated_at
  BEFORE UPDATE ON public.workflow_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_credentials_updated_at();