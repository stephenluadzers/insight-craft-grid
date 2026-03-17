-- Agent memory tables for persistent agent state
CREATE TABLE public.agent_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE SET NULL,
  memory_type TEXT NOT NULL DEFAULT 'short_term', -- short_term, long_term, episodic
  memory_key TEXT NOT NULL,
  memory_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  relevance_score REAL DEFAULT 1.0,
  access_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(workspace_id, workflow_id, memory_key)
);

ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace agent memory"
  ON public.agent_memory FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert agent memory"
  ON public.agent_memory FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can update agent memory"
  ON public.agent_memory FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can delete agent memory"
  ON public.agent_memory FOR DELETE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE INDEX idx_agent_memory_lookup ON public.agent_memory(workspace_id, workflow_id, memory_type);
CREATE INDEX idx_agent_memory_expires ON public.agent_memory(expires_at) WHERE expires_at IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_agent_memory_updated_at
  BEFORE UPDATE ON public.agent_memory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();