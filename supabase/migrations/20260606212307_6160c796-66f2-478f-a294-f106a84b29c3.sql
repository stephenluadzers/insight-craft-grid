-- Wave 4: Governance & Observability

CREATE TABLE public.workflow_environments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  environment TEXT NOT NULL CHECK (environment IN ('dev','staging','prod')),
  version_id UUID,
  promoted_by UUID REFERENCES auth.users(id),
  promoted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  config_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, environment)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_environments TO authenticated;
GRANT ALL ON public.workflow_environments TO service_role;
ALTER TABLE public.workflow_environments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage envs" ON public.workflow_environments
  FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE TRIGGER set_workflow_environments_updated_at BEFORE UPDATE ON public.workflow_environments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.step_cost_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  execution_id UUID,
  node_id TEXT NOT NULL,
  node_type TEXT,
  provider TEXT,
  model TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.step_cost_metrics TO authenticated;
GRANT ALL ON public.step_cost_metrics TO service_role;
ALTER TABLE public.step_cost_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read step costs" ON public.step_cost_metrics
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workflows w JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id WHERE w.id = workflow_id AND wm.user_id = auth.uid()));
CREATE POLICY "Members insert step costs" ON public.step_cost_metrics
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.workflows w JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id WHERE w.id = workflow_id AND wm.user_id = auth.uid()));
CREATE INDEX idx_step_cost_workflow ON public.step_cost_metrics(workflow_id, recorded_at DESC);

CREATE TABLE public.governance_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.governance_events TO authenticated;
GRANT ALL ON public.governance_events TO service_role;
ALTER TABLE public.governance_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view governance" ON public.governance_events
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members insert governance" ON public.governance_events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE INDEX idx_governance_ws_time ON public.governance_events(workspace_id, created_at DESC);

CREATE TABLE public.pii_scrubbing_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pattern TEXT NOT NULL,
  replacement TEXT NOT NULL DEFAULT '[REDACTED]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pii_scrubbing_rules TO authenticated;
GRANT ALL ON public.pii_scrubbing_rules TO service_role;
ALTER TABLE public.pii_scrubbing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage scrub rules" ON public.pii_scrubbing_rules
  FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE TRIGGER set_pii_scrubbing_rules_updated_at BEFORE UPDATE ON public.pii_scrubbing_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();