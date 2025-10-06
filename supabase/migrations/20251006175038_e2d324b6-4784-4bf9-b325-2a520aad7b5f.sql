-- Fix security definer view by enabling security_invoker mode
-- This makes the view respect RLS policies of the querying user, not the view creator

-- Recreate the view with security_invoker enabled
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public 
WITH (security_invoker=on)
AS
SELECT 
  id,
  full_name,
  avatar_url,
  default_workspace_id,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to authenticated users
GRANT SELECT ON public.profiles_public TO authenticated;

-- Add documentation
COMMENT ON VIEW public.profiles_public IS 
'Public view of user profiles that excludes email addresses. Use this view when displaying profiles of other users in shared workspaces. The view uses SECURITY INVOKER mode to respect RLS policies of the querying user.';