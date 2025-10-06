-- Drop the security definer view (security risk)
DROP VIEW IF EXISTS public.workflow_webhooks_safe CASCADE;

-- Add explicit policies to deny anonymous access to profiles
CREATE POLICY "Require authentication for profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- Add explicit policies to deny anonymous access to audit_logs
CREATE POLICY "Require authentication for audit_logs"
ON public.audit_logs
FOR SELECT
TO anon
USING (false);

-- Add explicit policies to deny anonymous access to workflow_executions
CREATE POLICY "Require authentication for workflow_executions"
ON public.workflow_executions
FOR SELECT
TO anon
USING (false);

-- Add explicit policies to deny anonymous access to webhook_access_logs
CREATE POLICY "Require authentication for webhook_access_logs"
ON public.webhook_access_logs
FOR SELECT
TO anon
USING (false);

-- Add explicit policies to deny anonymous access to workflow_comments
CREATE POLICY "Require authentication for workflow_comments"
ON public.workflow_comments
FOR SELECT
TO anon
USING (false);

-- Add explicit policies to deny anonymous access to workflow_versions
CREATE POLICY "Require authentication for workflow_versions"
ON public.workflow_versions
FOR SELECT
TO anon
USING (false);

-- Add explicit policies to deny anonymous access to workflow_webhooks
CREATE POLICY "Require authentication for workflow_webhooks"
ON public.workflow_webhooks
FOR SELECT
TO anon
USING (false);

-- Add explicit policies to deny anonymous access to workflow_schedules
CREATE POLICY "Require authentication for workflow_schedules"
ON public.workflow_schedules
FOR SELECT
TO anon
USING (false);

-- Add explicit policies to deny anonymous access to workflows
CREATE POLICY "Require authentication for workflows"
ON public.workflows
FOR SELECT
TO anon
USING (false);

-- Add explicit policies to deny anonymous access to workspace_members
CREATE POLICY "Require authentication for workspace_members"
ON public.workspace_members
FOR SELECT
TO anon
USING (false);

-- Add explicit policies to deny anonymous access to workspaces
CREATE POLICY "Require authentication for workspaces"
ON public.workspaces
FOR SELECT
TO anon
USING (false);