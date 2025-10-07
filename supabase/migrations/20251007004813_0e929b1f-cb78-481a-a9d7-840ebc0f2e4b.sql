-- Fix search_path for remaining functions that might be missing it

-- Fix handle_new_user function (already has SECURITY DEFINER, ensure search_path is set)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

-- Fix handle_new_workspace function
CREATE OR REPLACE FUNCTION public.handle_new_workspace()
RETURNS trigger
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

-- Fix handle_new_user_workspace function
CREATE OR REPLACE FUNCTION public.handle_new_user_workspace()
RETURNS trigger
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

-- Fix log_template_changes function
CREATE OR REPLACE FUNCTION public.log_template_changes()
RETURNS trigger
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

-- Fix validate_template_publication function
CREATE OR REPLACE FUNCTION public.validate_template_publication()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_public = true AND NEW.approval_status != 'approved' THEN
    RAISE EXCEPTION 'Templates must be approved before being made public';
  END IF;
  RETURN NEW;
END;
$$;

-- Fix purge_old_webhook_logs function
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