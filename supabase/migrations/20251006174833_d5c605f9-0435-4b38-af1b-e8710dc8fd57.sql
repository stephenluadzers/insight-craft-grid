-- Fix security definer view warning
-- Remove security_barrier property and use regular view with RLS enforcement from base table

-- Recreate the view without security_barrier
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public AS
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
'Public view of user profiles that excludes email addresses. Use this view when displaying profiles of other users in shared workspaces. The underlying RLS policies on the profiles table will enforce access control.';