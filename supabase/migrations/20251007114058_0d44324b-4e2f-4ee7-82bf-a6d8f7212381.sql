-- ============================================
-- SECURITY & MALICIOUS CODE PREVENTION
-- Phase 2: Security Controls
-- ============================================

-- 1. WORKFLOW SECURITY SCAN RESULTS
-- ============================================
CREATE TYPE security_risk_level AS ENUM ('safe', 'low', 'medium', 'high', 'critical');
CREATE TYPE scan_status AS ENUM ('pending', 'scanning', 'completed', 'failed');

CREATE TABLE public.workflow_security_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  scan_status scan_status NOT NULL DEFAULT 'pending',
  risk_level security_risk_level NOT NULL DEFAULT 'safe',
  issues_found INTEGER NOT NULL DEFAULT 0,
  scan_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scanned_by UUID REFERENCES auth.users(id),
  approved BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_notes TEXT
);

CREATE INDEX idx_security_scans_workflow ON public.workflow_security_scans(workflow_id, scanned_at DESC);
CREATE INDEX idx_security_scans_risk ON public.workflow_security_scans(risk_level) WHERE risk_level IN ('high', 'critical');
CREATE INDEX idx_security_scans_approval ON public.workflow_security_scans(approved) WHERE approved = false;

-- 2. EXECUTION RESOURCE LIMITS
-- ============================================
CREATE TABLE public.workspace_execution_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  max_execution_time_seconds INTEGER NOT NULL DEFAULT 300,
  max_memory_mb INTEGER NOT NULL DEFAULT 512,
  max_api_calls_per_execution INTEGER NOT NULL DEFAULT 100,
  max_data_size_kb INTEGER NOT NULL DEFAULT 10240,
  max_concurrent_executions INTEGER NOT NULL DEFAULT 5,
  allow_external_urls BOOLEAN NOT NULL DEFAULT false,
  allowed_domains TEXT[] DEFAULT ARRAY[]::TEXT[],
  blocked_domains TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_exec_limits_workspace ON public.workspace_execution_limits(workspace_id);

-- 3. DANGEROUS OPERATIONS LOG
-- ============================================
CREATE TYPE operation_action AS ENUM ('allowed', 'blocked', 'flagged');

CREATE TABLE public.dangerous_operations_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL,
  operation_details JSONB NOT NULL,
  risk_level security_risk_level NOT NULL,
  action_taken operation_action NOT NULL,
  reason TEXT NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_dangerous_ops_workspace ON public.dangerous_operations_log(workspace_id, detected_at DESC);
CREATE INDEX idx_dangerous_ops_risk ON public.dangerous_operations_log(risk_level, action_taken);
CREATE INDEX idx_dangerous_ops_blocked ON public.dangerous_operations_log(action_taken) WHERE action_taken = 'blocked';

-- 4. SECURITY RULES
-- ============================================
CREATE TABLE public.security_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL UNIQUE,
  rule_type TEXT NOT NULL,
  pattern TEXT NOT NULL,
  risk_level security_risk_level NOT NULL,
  description TEXT NOT NULL,
  remediation TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  auto_block BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_rules_enabled ON public.security_rules(enabled) WHERE enabled = true;
CREATE INDEX idx_security_rules_type ON public.security_rules(rule_type);

-- Insert default security rules
INSERT INTO public.security_rules (rule_name, rule_type, pattern, risk_level, description, remediation, auto_block) VALUES
('sql-injection-attempt', 'code_pattern', '(DROP|DELETE|TRUNCATE|ALTER)\s+(TABLE|DATABASE)', 'critical', 'Potential SQL injection attempt detected', 'Review workflow for SQL injection vulnerabilities', true),
('command-injection', 'code_pattern', '(eval|exec|system|subprocess|shell)', 'critical', 'Command execution attempt detected', 'Remove command execution code from workflow', true),
('sensitive-data-exposure', 'data_pattern', '(password|secret|api[_-]?key|token|private[_-]?key)', 'high', 'Potential sensitive data in workflow', 'Remove hardcoded credentials, use secure credential storage', false),
('external-url-access', 'network_pattern', 'https?://(?!api\\.)(.*)', 'medium', 'External URL access detected', 'Review external API calls and add to allowlist', false),
('file-system-access', 'code_pattern', '(fs\.|file\.|readFile|writeFile|unlink)', 'high', 'File system access detected', 'Remove file system operations', true),
('excessive-loops', 'code_pattern', 'while\s*\(\s*true\s*\)', 'high', 'Infinite loop detected', 'Add proper loop termination conditions', false),
('crypto-mining', 'code_pattern', '(mining|miner|hashrate|cryptonight)', 'critical', 'Potential crypto mining code', 'Remove cryptocurrency mining code', true),
('data-exfiltration', 'code_pattern', '(btoa|atob|Buffer\.from.*base64)', 'medium', 'Potential data encoding/exfiltration', 'Review data encoding operations', false),
('ddos-pattern', 'network_pattern', 'for.*fetch|while.*fetch', 'high', 'Potential DDoS pattern detected', 'Implement rate limiting and remove excessive requests', true),
('prototype-pollution', 'code_pattern', '__proto__|constructor\[.*\]', 'high', 'Prototype pollution attempt', 'Remove prototype manipulation code', true);

-- 5. WORKFLOW APPROVAL QUEUE
-- ============================================
CREATE TABLE public.workflow_approval_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  security_scan_id UUID REFERENCES public.workflow_security_scans(id) ON DELETE SET NULL,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewer_notes TEXT,
  risk_assessment TEXT
);

CREATE INDEX idx_approval_queue_status ON public.workflow_approval_queue(status) WHERE status = 'pending';
CREATE INDEX idx_approval_queue_workspace ON public.workflow_approval_queue(workspace_id, requested_at DESC);

-- 6. SUSPICIOUS ACTIVITY DETECTION
-- ============================================
CREATE TABLE public.suspicious_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  activity_type TEXT NOT NULL,
  activity_details JSONB NOT NULL,
  severity security_risk_level NOT NULL,
  triggered_rules TEXT[] DEFAULT ARRAY[]::TEXT[],
  ip_address INET,
  user_agent TEXT,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  investigated BOOLEAN NOT NULL DEFAULT false,
  investigation_notes TEXT
);

CREATE INDEX idx_suspicious_activity_workspace ON public.suspicious_activity_log(workspace_id, detected_at DESC);
CREATE INDEX idx_suspicious_activity_user ON public.suspicious_activity_log(user_id, detected_at DESC);
CREATE INDEX idx_suspicious_activity_severity ON public.suspicious_activity_log(severity) WHERE severity IN ('high', 'critical');
CREATE INDEX idx_suspicious_activity_uninvestigated ON public.suspicious_activity_log(investigated) WHERE investigated = false;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Workflow Security Scans
ALTER TABLE public.workflow_security_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view security scans in their workspaces"
ON public.workflow_security_scans FOR SELECT
TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "System can insert security scans"
ON public.workflow_security_scans FOR INSERT
TO authenticated
WITH CHECK (workspace_id IN (
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Admins can approve security scans"
ON public.workflow_security_scans FOR UPDATE
TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members 
  WHERE user_id = auth.uid() 
  AND role IN ('owner', 'admin')
));

-- Workspace Execution Limits
ALTER TABLE public.workspace_execution_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view execution limits"
ON public.workspace_execution_limits FOR SELECT
TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members 
  WHERE user_id = auth.uid() 
  AND role IN ('owner', 'admin')
));

CREATE POLICY "Admins can manage execution limits"
ON public.workspace_execution_limits FOR ALL
TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members 
  WHERE user_id = auth.uid() 
  AND role IN ('owner', 'admin')
));

-- Dangerous Operations Log
ALTER TABLE public.dangerous_operations_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view dangerous operations"
ON public.dangerous_operations_log FOR SELECT
TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members 
  WHERE user_id = auth.uid() 
  AND role IN ('owner', 'admin')
));

-- Security Rules
ALTER TABLE public.security_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view enabled security rules"
ON public.security_rules FOR SELECT
TO authenticated
USING (enabled = true);

-- Workflow Approval Queue
ALTER TABLE public.workflow_approval_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view approval queue in their workspaces"
ON public.workflow_approval_queue FOR SELECT
TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can request approvals"
ON public.workflow_approval_queue FOR INSERT
TO authenticated
WITH CHECK (workspace_id IN (
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Admins can review approvals"
ON public.workflow_approval_queue FOR UPDATE
TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members 
  WHERE user_id = auth.uid() 
  AND role IN ('owner', 'admin')
));

-- Suspicious Activity Log
ALTER TABLE public.suspicious_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view suspicious activity"
ON public.suspicious_activity_log FOR SELECT
TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members 
  WHERE user_id = auth.uid() 
  AND role IN ('owner', 'admin')
));

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if workflow needs approval
CREATE OR REPLACE FUNCTION requires_security_approval(
  _workflow_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  latest_scan RECORD;
BEGIN
  SELECT * INTO latest_scan
  FROM workflow_security_scans
  WHERE workflow_id = _workflow_id
  ORDER BY scanned_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN true; -- No scan = needs approval
  END IF;
  
  IF latest_scan.risk_level IN ('high', 'critical') AND NOT latest_scan.approved THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Update workspace execution limits timestamp
CREATE OR REPLACE FUNCTION update_execution_limits_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_execution_limits_updated
BEFORE UPDATE ON public.workspace_execution_limits
FOR EACH ROW
EXECUTE FUNCTION update_execution_limits_timestamp();
