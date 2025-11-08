-- Predictive Analytics Tables
CREATE TABLE IF NOT EXISTS public.workflow_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  prediction_type TEXT NOT NULL, -- 'failure_risk', 'performance_degradation', 'cost_spike', 'scaling_need'
  confidence_score NUMERIC NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  predicted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  predicted_for TIMESTAMP WITH TIME ZONE NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  preventive_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'resolved', 'occurred', 'prevented'
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Workflow Health Scores
CREATE TABLE IF NOT EXISTS public.workflow_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  reliability_score INTEGER NOT NULL CHECK (reliability_score >= 0 AND reliability_score <= 100),
  efficiency_score INTEGER NOT NULL CHECK (efficiency_score >= 0 AND efficiency_score <= 100),
  cost_score INTEGER NOT NULL CHECK (cost_score >= 0 AND cost_score <= 100),
  security_score INTEGER NOT NULL CHECK (security_score >= 0 AND security_score <= 100),
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  previous_score INTEGER,
  trend TEXT -- 'improving', 'stable', 'declining'
);

-- Natural Language Commands Log
CREATE TABLE IF NOT EXISTS public.workflow_nl_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  command_text TEXT NOT NULL,
  command_type TEXT NOT NULL, -- 'query', 'action', 'create', 'modify'
  interpretation JSONB NOT NULL,
  workflow_ids UUID[] DEFAULT ARRAY[]::UUID[],
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  execution_status TEXT NOT NULL DEFAULT 'success', -- 'success', 'failed', 'partial'
  result JSONB,
  execution_time_ms INTEGER
);

-- Cross-Workflow Intelligence
CREATE TABLE IF NOT EXISTS public.workflow_redundancy_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  workflow_ids UUID[] NOT NULL,
  redundancy_type TEXT NOT NULL, -- 'duplicate', 'similar', 'overlapping'
  similarity_score NUMERIC NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
  cost_waste_cents INTEGER NOT NULL DEFAULT 0,
  suggested_consolidation JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'identified', -- 'identified', 'reviewed', 'consolidated', 'dismissed'
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Time-Travel Debugging Sessions
CREATE TABLE IF NOT EXISTS public.workflow_debug_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  snapshots JSONB NOT NULL DEFAULT '[]'::jsonb,
  modifications JSONB NOT NULL DEFAULT '[]'::jsonb,
  replay_count INTEGER NOT NULL DEFAULT 0
);

-- Smart Integration Suggestions
CREATE TABLE IF NOT EXISTS public.workflow_integration_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  suggested_integration TEXT NOT NULL,
  integration_category TEXT NOT NULL,
  current_approach TEXT NOT NULL,
  estimated_savings_cents INTEGER,
  estimated_time_savings_hours NUMERIC,
  confidence_score NUMERIC NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  implementation_complexity TEXT NOT NULL, -- 'low', 'medium', 'high'
  suggested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'implemented'
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Workflow Documentation Auto-Generation
CREATE TABLE IF NOT EXISTS public.workflow_documentation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  content JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  generated_by TEXT NOT NULL DEFAULT 'ai', -- 'ai', 'user'
  documentation_type TEXT NOT NULL, -- 'overview', 'setup_guide', 'troubleshooting', 'api_reference'
  is_current BOOLEAN NOT NULL DEFAULT true
);

-- Compliance Audit Trails
CREATE TABLE IF NOT EXISTS public.workflow_compliance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES public.workflow_executions(id),
  workspace_id UUID NOT NULL,
  compliance_framework TEXT NOT NULL, -- 'SOC2', 'GDPR', 'HIPAA', 'PCI-DSS'
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  data_accessed JSONB,
  user_id UUID REFERENCES auth.users(id),
  ip_address INET,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified_hash TEXT
);

-- Mobile Push Notifications
CREATE TABLE IF NOT EXISTS public.workflow_mobile_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  workspace_id UUID NOT NULL,
  workflow_id UUID REFERENCES public.workflows(id),
  notification_type TEXT NOT NULL, -- 'approval_required', 'failure_alert', 'prediction', 'health_score'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'
  action_url TEXT,
  action_required BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  acted_at TIMESTAMP WITH TIME ZONE,
  device_tokens TEXT[] DEFAULT ARRAY[]::TEXT[]
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_predictions_workflow ON public.workflow_predictions(workflow_id, predicted_for);
CREATE INDEX IF NOT EXISTS idx_predictions_workspace ON public.workflow_predictions(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_health_scores_workflow ON public.workflow_health_scores(workflow_id, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_nl_commands_workspace ON public.workflow_nl_commands(workspace_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_redundancy_workspace ON public.workflow_redundancy_analysis(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_debug_sessions_execution ON public.workflow_debug_sessions(execution_id);
CREATE INDEX IF NOT EXISTS idx_integration_suggestions_workflow ON public.workflow_integration_suggestions(workflow_id, status);
CREATE INDEX IF NOT EXISTS idx_documentation_workflow ON public.workflow_documentation(workflow_id, is_current);
CREATE INDEX IF NOT EXISTS idx_compliance_logs_workflow ON public.workflow_compliance_logs(workflow_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_mobile_notifications_user ON public.workflow_mobile_notifications(user_id, sent_at DESC);

-- Enable RLS
ALTER TABLE public.workflow_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_nl_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_redundancy_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_debug_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_integration_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_documentation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_compliance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_mobile_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view predictions in their workspaces"
  ON public.workflow_predictions FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view health scores in their workspaces"
  ON public.workflow_health_scores FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view their NL commands"
  ON public.workflow_nl_commands FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert NL commands"
  ON public.workflow_nl_commands FOR INSERT
  WITH CHECK (user_id = auth.uid() AND workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view redundancy analysis"
  ON public.workflow_redundancy_analysis FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create debug sessions"
  ON public.workflow_debug_sessions FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view integration suggestions"
  ON public.workflow_integration_suggestions FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update integration suggestions"
  ON public.workflow_integration_suggestions FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view documentation"
  ON public.workflow_documentation FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can view compliance logs"
  ON public.workflow_compliance_logs FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Users can view their mobile notifications"
  ON public.workflow_mobile_notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their mobile notifications"
  ON public.workflow_mobile_notifications FOR UPDATE
  USING (user_id = auth.uid());