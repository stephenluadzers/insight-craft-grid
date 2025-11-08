-- Workflow testing and sandbox tables
CREATE TABLE IF NOT EXISTS public.workflow_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  test_type TEXT NOT NULL CHECK (test_type IN ('sandbox', 'dry_run', 'mock_data', 'integration')),
  input_data JSONB NOT NULL DEFAULT '{}',
  expected_output JSONB,
  actual_output JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'passed', 'failed', 'error')),
  execution_time_ms INTEGER,
  error_message TEXT,
  mock_responses JSONB DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Collaboration real-time sessions
CREATE TABLE IF NOT EXISTS public.workflow_collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  cursor_position JSONB,
  selected_node_id TEXT,
  is_editing BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cost tracking per execution
CREATE TABLE IF NOT EXISTS public.workflow_cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  cost_type TEXT NOT NULL CHECK (cost_type IN ('api_call', 'compute', 'storage', 'data_transfer', 'external_service')),
  cost_amount_cents INTEGER NOT NULL DEFAULT 0,
  provider TEXT,
  usage_quantity NUMERIC,
  usage_unit TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Business metrics aggregation
CREATE TABLE IF NOT EXISTS public.workflow_business_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_executions INTEGER NOT NULL DEFAULT 0,
  successful_executions INTEGER NOT NULL DEFAULT 0,
  failed_executions INTEGER NOT NULL DEFAULT 0,
  total_cost_cents INTEGER NOT NULL DEFAULT 0,
  avg_execution_time_ms INTEGER,
  time_saved_hours NUMERIC,
  roi_score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, workspace_id, date)
);

-- Test run steps for detailed test execution
CREATE TABLE IF NOT EXISTS public.workflow_test_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_id UUID NOT NULL REFERENCES public.workflow_test_runs(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'passed', 'failed', 'skipped')),
  input_data JSONB,
  output_data JSONB,
  expected_output JSONB,
  mock_used BOOLEAN DEFAULT false,
  execution_time_ms INTEGER,
  error_message TEXT,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.workflow_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_collaboration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_cost_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_business_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_test_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for test runs
CREATE POLICY "Users can view test runs in their workspaces"
  ON public.workflow_test_runs FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create test runs in their workspaces"
  ON public.workflow_test_runs FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Users can update their test runs"
  ON public.workflow_test_runs FOR UPDATE
  USING (created_by = auth.uid());

-- RLS Policies for collaboration sessions
CREATE POLICY "Users can view collaboration sessions for workflows they access"
  ON public.workflow_collaboration_sessions FOR SELECT
  USING (workflow_id IN (
    SELECT w.id FROM public.workflows w
    JOIN public.workspace_members wm ON w.workspace_id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their own collaboration sessions"
  ON public.workflow_collaboration_sessions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for cost tracking
CREATE POLICY "Users can view cost tracking in their workspaces"
  ON public.workflow_cost_tracking FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "System can insert cost tracking"
  ON public.workflow_cost_tracking FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid()
  ));

-- RLS Policies for business metrics
CREATE POLICY "Users can view business metrics in their workspaces"
  ON public.workflow_business_metrics FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage business metrics"
  ON public.workflow_business_metrics FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  ));

-- RLS Policies for test steps
CREATE POLICY "Users can view test steps for their test runs"
  ON public.workflow_test_steps FOR SELECT
  USING (test_run_id IN (
    SELECT id FROM public.workflow_test_runs
    WHERE created_by = auth.uid()
  ));

CREATE POLICY "System can insert test steps"
  ON public.workflow_test_steps FOR INSERT
  WITH CHECK (test_run_id IN (
    SELECT id FROM public.workflow_test_runs
    WHERE created_by = auth.uid()
  ));

-- Indexes for performance
CREATE INDEX idx_test_runs_workflow ON public.workflow_test_runs(workflow_id);
CREATE INDEX idx_test_runs_workspace ON public.workflow_test_runs(workspace_id);
CREATE INDEX idx_test_runs_status ON public.workflow_test_runs(status);
CREATE INDEX idx_collaboration_workflow ON public.workflow_collaboration_sessions(workflow_id);
CREATE INDEX idx_collaboration_user ON public.workflow_collaboration_sessions(user_id);
CREATE INDEX idx_cost_tracking_workflow ON public.workflow_cost_tracking(workflow_id);
CREATE INDEX idx_cost_tracking_execution ON public.workflow_cost_tracking(execution_id);
CREATE INDEX idx_business_metrics_workflow_date ON public.workflow_business_metrics(workflow_id, date);
CREATE INDEX idx_test_steps_run ON public.workflow_test_steps(test_run_id);

-- Trigger to update business metrics updated_at
CREATE TRIGGER update_workflow_business_metrics_updated_at
  BEFORE UPDATE ON public.workflow_business_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to cleanup old collaboration sessions
CREATE OR REPLACE FUNCTION public.cleanup_old_collaboration_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.workflow_collaboration_sessions
  WHERE last_seen_at < now() - interval '30 minutes';
END;
$$;

-- Enable realtime for collaboration
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_collaboration_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_comments;