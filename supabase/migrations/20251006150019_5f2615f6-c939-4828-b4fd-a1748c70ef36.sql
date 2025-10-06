-- Phase 1: Critical Security Fixes

-- 1. Create security definer function to safely check user roles (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 2. Create function to check if user has role in specific workspace
CREATE OR REPLACE FUNCTION public.has_workspace_role(_user_id uuid, _workspace_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE user_id = _user_id
      AND workspace_id = _workspace_id
      AND role = _role
  )
$$;

-- 3. Create function to check if user is member of workspace
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE user_id = _user_id
      AND workspace_id = _workspace_id
  )
$$;

-- 4. Automatically add owner as workspace member when workspace is created
CREATE OR REPLACE FUNCTION public.handle_new_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role, invited_by)
  VALUES (NEW.id, NEW.owner_id, 'owner', NEW.owner_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_workspace_created
  AFTER INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_workspace();

-- 5. Automatically create default workspace for new users and add them as member
CREATE OR REPLACE FUNCTION public.handle_new_user_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_workspace_id uuid;
BEGIN
  -- Create default workspace for new user
  INSERT INTO public.workspaces (name, slug, owner_id)
  VALUES (
    COALESCE(NEW.full_name, 'My Workspace'),
    LOWER(REPLACE(COALESCE(NEW.full_name, NEW.email), ' ', '-')) || '-' || substr(NEW.id::text, 1, 8),
    NEW.id
  )
  RETURNING id INTO new_workspace_id;
  
  -- Update profile with default workspace
  UPDATE public.profiles
  SET default_workspace_id = new_workspace_id
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_workspace();

-- 6. Secure workflow_versions table with proper RLS policies
DROP POLICY IF EXISTS "Users can view workflow versions in their workspaces" ON public.workflow_versions;

CREATE POLICY "Members can view workflow versions"
  ON public.workflow_versions
  FOR SELECT
  USING (
    public.is_workspace_member(
      auth.uid(),
      (SELECT workspace_id FROM workflows WHERE id = workflow_id)
    )
  );

CREATE POLICY "Editors can create workflow versions"
  ON public.workflow_versions
  FOR INSERT
  WITH CHECK (
    public.has_workspace_role(
      auth.uid(),
      (SELECT workspace_id FROM workflows WHERE id = workflow_id),
      'owner'
    ) OR
    public.has_workspace_role(
      auth.uid(),
      (SELECT workspace_id FROM workflows WHERE id = workflow_id),
      'admin'
    ) OR
    public.has_workspace_role(
      auth.uid(),
      (SELECT workspace_id FROM workflows WHERE id = workflow_id),
      'editor'
    )
  );

CREATE POLICY "Owners can delete workflow versions"
  ON public.workflow_versions
  FOR DELETE
  USING (
    public.has_workspace_role(
      auth.uid(),
      (SELECT workspace_id FROM workflows WHERE id = workflow_id),
      'owner'
    )
  );

-- 7. Add field-level security for webhook keys
-- Create view that excludes webhook_key for non-admins
CREATE OR REPLACE VIEW public.workflow_webhooks_safe AS
SELECT 
  id,
  workflow_id,
  enabled,
  created_at,
  last_triggered_at,
  CASE 
    WHEN public.has_workspace_role(
      auth.uid(),
      (SELECT workspace_id FROM workflows WHERE id = workflow_id),
      'owner'
    ) OR public.has_workspace_role(
      auth.uid(),
      (SELECT workspace_id FROM workflows WHERE id = workflow_id),
      'admin'
    ) THEN webhook_key
    ELSE '***REDACTED***'
  END as webhook_key
FROM public.workflow_webhooks;

-- 8. Add audit logging for webhook key access
CREATE TABLE IF NOT EXISTS public.webhook_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid REFERENCES public.workflow_webhooks(id) ON DELETE CASCADE,
  accessed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accessed_at timestamp with time zone DEFAULT now(),
  action text NOT NULL,
  ip_address inet
);

ALTER TABLE public.webhook_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view webhook access logs"
  ON public.webhook_access_logs
  FOR SELECT
  USING (
    public.has_workspace_role(
      auth.uid(),
      (SELECT workspace_id FROM workflows w 
       JOIN workflow_webhooks wh ON w.id = wh.workflow_id 
       WHERE wh.id = webhook_id),
      'owner'
    ) OR
    public.has_workspace_role(
      auth.uid(),
      (SELECT workspace_id FROM workflows w 
       JOIN workflow_webhooks wh ON w.id = wh.workflow_id 
       WHERE wh.id = webhook_id),
      'admin'
    )
  );

-- 9. Update workspace_members policies to use security definer functions
DROP POLICY IF EXISTS "Admins can manage workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON public.workspace_members;

CREATE POLICY "Members can view workspace members"
  ON public.workspace_members
  FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can manage members"
  ON public.workspace_members
  FOR ALL
  USING (
    public.has_workspace_role(auth.uid(), workspace_id, 'owner') OR
    public.has_workspace_role(auth.uid(), workspace_id, 'admin')
  );