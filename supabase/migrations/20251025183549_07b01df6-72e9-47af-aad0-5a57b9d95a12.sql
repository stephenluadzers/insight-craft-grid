-- Fix remaining SECURITY DEFINER functions missing search_path

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$function$;

-- Update requires_security_approval function
CREATE OR REPLACE FUNCTION public.requires_security_approval(_workflow_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Update log_template_changes function
CREATE OR REPLACE FUNCTION public.log_template_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Update handle_new_workspace function
CREATE OR REPLACE FUNCTION public.handle_new_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role, invited_by)
  VALUES (NEW.id, NEW.owner_id, 'owner', NEW.owner_id);
  RETURN NEW;
END;
$function$;

-- Update handle_new_user_workspace function
CREATE OR REPLACE FUNCTION public.handle_new_user_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Update purge_old_webhook_logs function
CREATE OR REPLACE FUNCTION public.purge_old_webhook_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.webhook_access_logs
  WHERE expires_at < now();
END;
$function$;