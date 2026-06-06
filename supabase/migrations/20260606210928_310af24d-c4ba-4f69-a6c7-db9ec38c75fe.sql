-- Step-level run logs for the Step Inspector and Run Replay
CREATE TABLE public.run_step_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  node_type text,
  status text NOT NULL CHECK (status IN ('pending','running','completed','failed','skipped','retrying')),
  attempt integer NOT NULL DEFAULT 1,
  input_payload jsonb,
  output_payload jsonb,
  error_message text,
  error_stack text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer,
  branch text DEFAULT 'success' CHECK (branch IN ('success','error')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_run_step_logs_execution ON public.run_step_logs(execution_id);
CREATE INDEX idx_run_step_logs_workflow ON public.run_step_logs(workflow_id, started_at DESC);
CREATE INDEX idx_run_step_logs_node ON public.run_step_logs(execution_id, node_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.run_step_logs TO authenticated;
GRANT ALL ON public.run_step_logs TO service_role;

ALTER TABLE public.run_step_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view run step logs"
ON public.run_step_logs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workflows w
    JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id
    WHERE w.id = run_step_logs.workflow_id AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Workspace editors can insert run step logs"
ON public.run_step_logs FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workflows w
    JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id
    WHERE w.id = run_step_logs.workflow_id AND wm.user_id = auth.uid()
  )
);

-- Per-node retry policy
CREATE TABLE public.workflow_step_retries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts >= 1 AND max_attempts <= 20),
  backoff_strategy text NOT NULL DEFAULT 'exponential' CHECK (backoff_strategy IN ('none','linear','exponential')),
  initial_delay_ms integer NOT NULL DEFAULT 1000,
  max_delay_ms integer NOT NULL DEFAULT 60000,
  retry_on_errors text[] DEFAULT ARRAY['timeout','network','5xx']::text[],
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, node_id)
);

CREATE INDEX idx_workflow_step_retries_workflow ON public.workflow_step_retries(workflow_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_step_retries TO authenticated;
GRANT ALL ON public.workflow_step_retries TO service_role;

ALTER TABLE public.workflow_step_retries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view retry policies"
ON public.workflow_step_retries FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workflows w
    JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id
    WHERE w.id = workflow_step_retries.workflow_id AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Workspace editors can manage retry policies"
ON public.workflow_step_retries FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workflows w
    JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id
    WHERE w.id = workflow_step_retries.workflow_id AND wm.user_id = auth.uid()
      AND wm.role IN ('owner','admin','editor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workflows w
    JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id
    WHERE w.id = workflow_step_retries.workflow_id AND wm.user_id = auth.uid()
      AND wm.role IN ('owner','admin','editor')
  )
);

CREATE TRIGGER set_workflow_step_retries_updated_at
BEFORE UPDATE ON public.workflow_step_retries
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- Cached AI diagnostics for failed steps
CREATE TABLE public.workflow_failure_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  root_cause text NOT NULL,
  explanation text NOT NULL,
  suggested_fix jsonb,
  confidence numeric(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  applied boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_failure_diagnostics_execution ON public.workflow_failure_diagnostics(execution_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_failure_diagnostics TO authenticated;
GRANT ALL ON public.workflow_failure_diagnostics TO service_role;

ALTER TABLE public.workflow_failure_diagnostics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view diagnostics"
ON public.workflow_failure_diagnostics FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workflows w
    JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id
    WHERE w.id = workflow_failure_diagnostics.workflow_id AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Workspace editors can manage diagnostics"
ON public.workflow_failure_diagnostics FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workflows w
    JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id
    WHERE w.id = workflow_failure_diagnostics.workflow_id AND wm.user_id = auth.uid()
      AND wm.role IN ('owner','admin','editor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workflows w
    JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id
    WHERE w.id = workflow_failure_diagnostics.workflow_id AND wm.user_id = auth.uid()
      AND wm.role IN ('owner','admin','editor')
  )
);