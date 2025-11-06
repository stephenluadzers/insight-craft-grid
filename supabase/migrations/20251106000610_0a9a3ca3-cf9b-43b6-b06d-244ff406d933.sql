-- Drop existing table if any
DROP TABLE IF EXISTS public.workflows CASCADE;

-- Create workflows table for persistent storage
CREATE TABLE public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  connections JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes BEFORE enabling RLS
CREATE INDEX idx_workflows_user_id ON public.workflows(user_id);
CREATE INDEX idx_workflows_updated_at ON public.workflows(updated_at DESC);

-- Enable RLS
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies AFTER table is fully created
CREATE POLICY "workflows_select_policy" ON public.workflows
  FOR SELECT USING (user_id::text = (SELECT auth.uid()::text));

CREATE POLICY "workflows_insert_policy" ON public.workflows
  FOR INSERT WITH CHECK (user_id::text = (SELECT auth.uid()::text));

CREATE POLICY "workflows_update_policy" ON public.workflows
  FOR UPDATE USING (user_id::text = (SELECT auth.uid()::text));

CREATE POLICY "workflows_delete_policy" ON public.workflows
  FOR DELETE USING (user_id::text = (SELECT auth.uid()::text));

-- Create update trigger function and trigger
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_workflows_updated_at
  BEFORE UPDATE ON public.workflows
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();