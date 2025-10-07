-- ============================================
-- ENTERPRISE ROADMAP IMPLEMENTATION
-- Phase 1: Critical Infrastructure
-- ============================================

-- 1. EXECUTION QUEUE & JOB MANAGEMENT
-- ============================================
CREATE TYPE queue_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'dead_letter');
CREATE TYPE queue_priority AS ENUM ('low', 'normal', 'high', 'critical');

CREATE TABLE public.workflow_execution_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  status queue_status NOT NULL DEFAULT 'pending',
  priority queue_priority NOT NULL DEFAULT 'normal',
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  execution_data JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

CREATE INDEX idx_queue_status_priority ON public.workflow_execution_queue(status, priority, scheduled_at);
CREATE INDEX idx_queue_workspace ON public.workflow_execution_queue(workspace_id);
CREATE INDEX idx_queue_next_retry ON public.workflow_execution_queue(next_retry_at) WHERE next_retry_at IS NOT NULL;

-- 2. DEAD LETTER QUEUE
-- ============================================
CREATE TABLE public.workflow_dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_item_id UUID NOT NULL REFERENCES public.workflow_execution_queue(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  failure_count INTEGER NOT NULL,
  last_error TEXT NOT NULL,
  execution_data JSONB,
  failed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  investigated BOOLEAN NOT NULL DEFAULT false,
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_dlq_workspace ON public.workflow_dead_letter_queue(workspace_id, failed_at DESC);
CREATE INDEX idx_dlq_investigated ON public.workflow_dead_letter_queue(investigated) WHERE investigated = false;

-- 3. PERFORMANCE METRICS
-- ============================================
CREATE TABLE public.workflow_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  memory_usage_mb DECIMAL(10,2),
  cpu_usage_percent DECIMAL(5,2),
  api_calls INTEGER DEFAULT 0,
  data_transferred_kb DECIMAL(10,2),
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_perf_workflow ON public.workflow_performance_metrics(workflow_id, recorded_at DESC);
CREATE INDEX idx_perf_node ON public.workflow_performance_metrics(node_id, recorded_at DESC);
CREATE INDEX idx_perf_workspace ON public.workflow_performance_metrics(workspace_id, recorded_at DESC);

-- 4. CIRCUIT BREAKER STATE
-- ============================================
CREATE TYPE circuit_state AS ENUM ('closed', 'open', 'half_open');

CREATE TABLE public.integration_circuit_breakers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_type TEXT NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  state circuit_state NOT NULL DEFAULT 'closed',
  failure_count INTEGER NOT NULL DEFAULT 0,
  failure_threshold INTEGER NOT NULL DEFAULT 5,
  success_count INTEGER NOT NULL DEFAULT 0,
  last_failure_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  half_open_at TIMESTAMP WITH TIME ZONE,
  timeout_duration_seconds INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(integration_type, workspace_id)
);

CREATE INDEX idx_circuit_workspace ON public.integration_circuit_breakers(workspace_id);
CREATE INDEX idx_circuit_state ON public.integration_circuit_breakers(state);

-- 5. RATE LIMITING
-- ============================================
CREATE TABLE public.workspace_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL, -- 'workflow_execution', 'api_call', 'integration'
  limit_per_minute INTEGER NOT NULL DEFAULT 60,
  limit_per_hour INTEGER NOT NULL DEFAULT 1000,
  limit_per_day INTEGER NOT NULL DEFAULT 10000,
  current_minute_count INTEGER NOT NULL DEFAULT 0,
  current_hour_count INTEGER NOT NULL DEFAULT 0,
  current_day_count INTEGER NOT NULL DEFAULT 0,
  minute_reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '1 minute'),
  hour_reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '1 hour'),
  day_reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '1 day'),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, resource_type)
);

CREATE INDEX idx_rate_limit_workspace ON public.workspace_rate_limits(workspace_id);

-- 6. ERROR AGGREGATION
-- ============================================
CREATE TABLE public.error_aggregation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  fingerprint TEXT NOT NULL, -- Hash of error type + message for grouping
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  workflow_ids UUID[] DEFAULT ARRAY[]::UUID[],
  node_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  UNIQUE(workspace_id, fingerprint)
);

CREATE INDEX idx_error_agg_workspace ON public.error_aggregation(workspace_id, last_seen_at DESC);
CREATE INDEX idx_error_agg_resolved ON public.error_aggregation(resolved) WHERE resolved = false;
CREATE INDEX idx_error_agg_fingerprint ON public.error_aggregation(fingerprint);

-- 7. SECRETS ROTATION TRACKING
-- ============================================
CREATE TABLE public.credential_rotation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id UUID NOT NULL REFERENCES public.workflow_credentials(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  rotated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  rotated_by UUID NOT NULL REFERENCES auth.users(id),
  rotation_type TEXT NOT NULL, -- 'manual', 'automatic', 'compromised'
  old_credential_hash TEXT NOT NULL,
  reason TEXT,
  success BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_rotation_log_credential ON public.credential_rotation_log(credential_id, rotated_at DESC);
CREATE INDEX idx_rotation_log_workspace ON public.credential_rotation_log(workspace_id, rotated_at DESC);

-- 8. BACKUP METADATA
-- ============================================
CREATE TABLE public.backup_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  backup_type TEXT NOT NULL, -- 'full', 'incremental'
  size_bytes BIGINT NOT NULL,
  workflow_count INTEGER NOT NULL,
  execution_count INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL, -- 'success', 'failed', 'partial'
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_backup_workspace ON public.backup_metadata(workspace_id, completed_at DESC);
CREATE INDEX idx_backup_verified ON public.backup_metadata(verified) WHERE verified = false;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Execution Queue
ALTER TABLE public.workflow_execution_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view queue items in their workspaces"
ON public.workflow_execution_queue FOR SELECT
TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Editors can insert queue items"
ON public.workflow_execution_queue FOR INSERT
TO authenticated
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin', 'editor')
  )
);

CREATE POLICY "System can update queue items"
ON public.workflow_execution_queue FOR UPDATE
TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
));

-- Dead Letter Queue
ALTER TABLE public.workflow_dead_letter_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view DLQ"
ON public.workflow_dead_letter_queue FOR SELECT
TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members 
  WHERE user_id = auth.uid() 
  AND role IN ('owner', 'admin')
));

CREATE POLICY "Admins can update DLQ"
ON public.workflow_dead_letter_queue FOR UPDATE
TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members 
  WHERE user_id = auth.uid() 
  AND role IN ('owner', 'admin')
));

-- Performance Metrics
ALTER TABLE public.workflow_performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view metrics in their workspaces"
ON public.workflow_performance_metrics FOR SELECT
TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
));

-- Circuit Breakers
ALTER TABLE public.integration_circuit_breakers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view circuit breakers in their workspaces"
ON public.integration_circuit_breakers FOR SELECT
TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
));

-- Rate Limits
ALTER TABLE public.workspace_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rate limits in their workspaces"
ON public.workspace_rate_limits FOR SELECT
TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
));

-- Error Aggregation
ALTER TABLE public.error_aggregation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view errors in their workspaces"
ON public.error_aggregation FOR SELECT
TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Admins can update error resolution"
ON public.error_aggregation FOR UPDATE
TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members 
  WHERE user_id = auth.uid() 
  AND role IN ('owner', 'admin')
));

-- Credential Rotation Log
ALTER TABLE public.credential_rotation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view rotation logs"
ON public.credential_rotation_log FOR SELECT
TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members 
  WHERE user_id = auth.uid() 
  AND role IN ('owner', 'admin')
));

-- Backup Metadata
ALTER TABLE public.backup_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view backup metadata"
ON public.backup_metadata FOR SELECT
TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members 
  WHERE user_id = auth.uid() 
  AND role IN ('owner', 'admin')
));

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Calculate exponential backoff for retries
CREATE OR REPLACE FUNCTION calculate_next_retry(
  retry_count INTEGER,
  base_delay_seconds INTEGER DEFAULT 60
)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
AS $$
BEGIN
  -- Exponential backoff: base_delay * (2 ^ retry_count)
  -- Max delay capped at 1 hour
  RETURN now() + (LEAST(base_delay_seconds * POWER(2, retry_count), 3600) || ' seconds')::INTERVAL;
END;
$$;

-- Update circuit breaker state
CREATE OR REPLACE FUNCTION update_circuit_breaker_state()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  
  -- Auto-transition from open to half-open after timeout
  IF NEW.state = 'open' AND 
     NEW.opened_at + (NEW.timeout_duration_seconds || ' seconds')::INTERVAL < now() THEN
    NEW.state = 'half_open';
    NEW.half_open_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_circuit_breaker_state
BEFORE UPDATE ON public.integration_circuit_breakers
FOR EACH ROW
EXECUTE FUNCTION update_circuit_breaker_state();

-- Auto-increment error aggregation
CREATE OR REPLACE FUNCTION increment_error_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.occurrence_count = NEW.occurrence_count + 1;
  NEW.last_seen_at = now();
  RETURN NEW;
END;
$$;
