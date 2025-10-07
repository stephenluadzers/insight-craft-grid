-- Drop the view approach
DROP VIEW IF EXISTS public.profiles_public CASCADE;

-- The get_workspace_member_profile function already exists and provides safe access
-- Just need to fix the search_path for other functions

-- Fix search_path for update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix search_path for update_workflow_schedules_updated_at function
CREATE OR REPLACE FUNCTION public.update_workflow_schedules_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix search_path for update_credentials_updated_at function
CREATE OR REPLACE FUNCTION public.update_credentials_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Ensure the "Workspace members can view public profile data only" policy 
-- allows viewing profiles but application should use get_workspace_member_profile()
-- function or explicitly select only non-email columns