-- Fix: Sensitive Workflow Secrets Access Control
-- Add audit logging for workflow execution secrets access

CREATE TABLE IF NOT EXISTS public.workflow_execution_secrets_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  accessed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accessed_at timestamp with time zone NOT NULL DEFAULT now(),
  access_type text NOT NULL CHECK (access_type IN ('read', 'write', 'delete')),
  ip_address inet,
  user_agent text
);

ALTER TABLE public.workflow_execution_secrets_audit ENABLE ROW LEVEL SECURITY;

-- Only admins/owners can view audit logs
CREATE POLICY "Admins can view secrets audit logs"
ON public.workflow_execution_secrets_audit
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workflow_executions we
    JOIN public.workspace_members wm ON wm.workspace_id = we.workspace_id
    WHERE we.id = workflow_execution_secrets_audit.execution_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
  )
);

-- System can insert audit logs (for edge functions)
CREATE POLICY "System can insert secrets audit logs"
ON public.workflow_execution_secrets_audit
FOR INSERT
WITH CHECK (accessed_by = auth.uid());

-- Audit logs are immutable
CREATE POLICY "Audit logs are immutable"
ON public.workflow_execution_secrets_audit
FOR UPDATE
USING (false);

-- Only owners can delete old audit logs
CREATE POLICY "Owners can delete old audit logs"
ON public.workflow_execution_secrets_audit
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.workflow_executions we
    JOIN public.workspace_members wm ON wm.workspace_id = we.workspace_id
    WHERE we.id = workflow_execution_secrets_audit.execution_id
      AND wm.user_id = auth.uid()
      AND wm.role = 'owner'
  )
);

-- Add created_by column to track who created the secrets
ALTER TABLE public.workflow_execution_secrets
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Add expires_at for time-based access control
ALTER TABLE public.workflow_execution_secrets
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_workflow_execution_secrets_expires_at 
ON public.workflow_execution_secrets(expires_at);

-- Update RLS policy to check expiration
DROP POLICY IF EXISTS "Admins can view sensitive execution data" ON public.workflow_execution_secrets;
CREATE POLICY "Admins can view sensitive execution data"
ON public.workflow_execution_secrets
FOR SELECT
USING (
  (expires_at IS NULL OR expires_at > now()) AND
  EXISTS (
    SELECT 1 FROM public.workflow_executions we
    JOIN public.workspace_members wm ON wm.workspace_id = we.workspace_id
    WHERE we.id = workflow_execution_secrets.execution_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
  )
);

-- Fix: Template Publication Safety
-- Add approval workflow for templates

ALTER TABLE public.workflow_templates
ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'draft' CHECK (approval_status IN ('draft', 'pending', 'approved', 'rejected'));

ALTER TABLE public.workflow_templates
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id);

ALTER TABLE public.workflow_templates
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;

ALTER TABLE public.workflow_templates
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Create audit log for template publication changes
CREATE TABLE IF NOT EXISTS public.workflow_templates_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
  changed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  old_status text,
  new_status text,
  old_is_public boolean,
  new_is_public boolean,
  change_reason text
);

ALTER TABLE public.workflow_templates_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view template audit logs"
ON public.workflow_templates_audit
FOR SELECT
USING (
  template_id IN (
    SELECT id FROM public.workflow_templates
    WHERE is_public = true OR created_by = auth.uid()
  )
);

-- System can insert audit logs
CREATE POLICY "System can insert template audit logs"
ON public.workflow_templates_audit
FOR INSERT
WITH CHECK (changed_by = auth.uid());

-- Create trigger to log template changes
CREATE OR REPLACE FUNCTION public.log_template_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.is_public IS DISTINCT FROM NEW.is_public) OR 
     (OLD.approval_status IS DISTINCT FROM NEW.approval_status) THEN
    INSERT INTO public.workflow_templates_audit (
      template_id,
      changed_by,
      old_status,
      new_status,
      old_is_public,
      new_is_public
    ) VALUES (
      NEW.id,
      auth.uid(),
      OLD.approval_status,
      NEW.approval_status,
      OLD.is_public,
      NEW.is_public
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_template_changes
BEFORE UPDATE ON public.workflow_templates
FOR EACH ROW
EXECUTE FUNCTION public.log_template_changes();

-- Update template policies to enforce approval workflow
DROP POLICY IF EXISTS "Public templates are viewable by everyone" ON public.workflow_templates;
CREATE POLICY "Public templates are viewable by everyone"
ON public.workflow_templates
FOR SELECT
USING (
  (is_public = true AND approval_status = 'approved') OR 
  created_by = auth.uid()
);

-- Only approved templates can be made public
CREATE OR REPLACE FUNCTION public.validate_template_publication()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_public = true AND NEW.approval_status != 'approved' THEN
    RAISE EXCEPTION 'Templates must be approved before being made public';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_validate_template_publication
BEFORE INSERT OR UPDATE ON public.workflow_templates
FOR EACH ROW
EXECUTE FUNCTION public.validate_template_publication();

-- Fix: Webhook Access Logs Protection
-- Add data retention and time-based restrictions

ALTER TABLE public.webhook_access_logs
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone DEFAULT (now() + interval '90 days');

CREATE INDEX IF NOT EXISTS idx_webhook_access_logs_expires_at 
ON public.webhook_access_logs(expires_at);

-- Create function to purge old webhook logs
CREATE OR REPLACE FUNCTION public.purge_old_webhook_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.webhook_access_logs
  WHERE expires_at < now();
END;
$$;

-- Create function to get sanitized webhook logs (without IPs for non-admins)
CREATE OR REPLACE FUNCTION public.get_webhook_logs(
  _webhook_id uuid,
  _limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  webhook_id uuid,
  action text,
  accessed_at timestamp with time zone,
  ip_address inet,
  accessed_by uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Check if user is admin/owner of the workspace
  SELECT EXISTS (
    SELECT 1 FROM public.workflow_webhooks wh
    JOIN public.workflows w ON w.id = wh.workflow_id
    JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id
    WHERE wh.id = _webhook_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
  ) INTO is_admin;

  IF is_admin THEN
    -- Admins see full data including IPs
    RETURN QUERY
    SELECT 
      wal.id,
      wal.webhook_id,
      wal.action,
      wal.accessed_at,
      wal.ip_address,
      wal.accessed_by
    FROM public.webhook_access_logs wal
    WHERE wal.webhook_id = _webhook_id
      AND wal.expires_at > now()
    ORDER BY wal.accessed_at DESC
    LIMIT _limit;
  ELSE
    -- Non-admins see sanitized data (no IPs)
    RETURN QUERY
    SELECT 
      wal.id,
      wal.webhook_id,
      wal.action,
      wal.accessed_at,
      NULL::inet as ip_address,
      wal.accessed_by
    FROM public.webhook_access_logs wal
    WHERE wal.webhook_id = _webhook_id
      AND wal.expires_at > now()
    ORDER BY wal.accessed_at DESC
    LIMIT _limit;
  END IF;
END;
$$;