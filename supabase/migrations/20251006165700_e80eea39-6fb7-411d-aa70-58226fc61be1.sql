-- Add comprehensive RLS policies for workflow_execution_secrets table
-- Only workspace owners and admins can INSERT sensitive execution data
CREATE POLICY "Admins can insert sensitive execution data"
ON public.workflow_execution_secrets
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.workflow_executions we
    JOIN public.workspace_members wm ON wm.workspace_id = we.workspace_id
    WHERE we.id = workflow_execution_secrets.execution_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
  )
);

-- Only workspace owners and admins can UPDATE sensitive execution data
CREATE POLICY "Admins can update sensitive execution data"
ON public.workflow_execution_secrets
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 
    FROM public.workflow_executions we
    JOIN public.workspace_members wm ON wm.workspace_id = we.workspace_id
    WHERE we.id = workflow_execution_secrets.execution_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
  )
);

-- Only workspace owners can DELETE sensitive execution data (more restrictive)
CREATE POLICY "Owners can delete sensitive execution data"
ON public.workflow_execution_secrets
FOR DELETE
USING (
  EXISTS (
    SELECT 1 
    FROM public.workflow_executions we
    JOIN public.workspace_members wm ON wm.workspace_id = we.workspace_id
    WHERE we.id = workflow_execution_secrets.execution_id
      AND wm.user_id = auth.uid()
      AND wm.role = 'owner'
  )
);

-- Fix webhook_access_logs audit integrity (prevent tampering)
-- System/admins can insert audit logs
CREATE POLICY "System can insert webhook access logs"
ON public.webhook_access_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.workflow_webhooks wh
    JOIN public.workflows w ON w.id = wh.workflow_id
    JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id
    WHERE wh.id = webhook_access_logs.webhook_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
  )
);

-- Prevent anyone from updating audit logs (immutable for integrity)
CREATE POLICY "Audit logs are immutable"
ON public.webhook_access_logs
FOR UPDATE
USING (false);

-- Only workspace owners can delete audit logs (e.g., for GDPR compliance)
CREATE POLICY "Owners can delete audit logs"
ON public.webhook_access_logs
FOR DELETE
USING (
  EXISTS (
    SELECT 1 
    FROM public.workflow_webhooks wh
    JOIN public.workflows w ON w.id = wh.workflow_id
    JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id
    WHERE wh.id = webhook_access_logs.webhook_id
      AND wm.user_id = auth.uid()
      AND wm.role = 'owner'
  )
);

-- Fix profiles table public exposure
-- Ensure profiles are completely hidden from anonymous users
DROP POLICY IF EXISTS "Require authentication for profiles" ON public.profiles;

-- Create explicit deny policy for anonymous users
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false);

-- Ensure authenticated users can only see profiles in their workspaces
-- The existing policies already handle this, but let's add a catch-all deny
CREATE POLICY "Deny access to profiles outside workspaces"
ON public.profiles
FOR SELECT
USING (
  -- User can see their own profile
  auth.uid() = id
  OR
  -- User can see profiles of workspace members
  EXISTS (
    SELECT 1 FROM public.workspace_members wm1
    JOIN public.workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
    WHERE wm1.user_id = auth.uid() 
      AND wm2.user_id = profiles.id
  )
);

-- Add index for better audit log performance
CREATE INDEX IF NOT EXISTS idx_webhook_access_logs_webhook_id 
ON public.webhook_access_logs(webhook_id);

-- Add comments documenting the security model
COMMENT ON TABLE public.workflow_execution_secrets 
IS 'Stores sensitive execution data (API keys, tokens). Only workspace owners/admins can manage. DELETE restricted to owners only.';

COMMENT ON TABLE public.webhook_access_logs 
IS 'Immutable audit logs for webhook access. Only admins can insert, owners can delete for compliance. UPDATE is blocked to preserve audit integrity.';