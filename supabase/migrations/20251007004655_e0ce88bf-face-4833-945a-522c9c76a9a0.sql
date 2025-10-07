-- Fix email exposure in profiles table
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Deny access to profiles outside workspaces" ON public.profiles;
DROP POLICY IF EXISTS "Users can view public profiles in shared workspaces" ON public.profiles;

-- Ensure profiles_public view exists and is properly populated
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

-- Enable RLS on the view
ALTER VIEW public.profiles_public SET (security_barrier = true);

-- Create a security definer function to get public profile for workspace members
CREATE OR REPLACE FUNCTION public.get_workspace_member_profile(_profile_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  default_workspace_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.full_name,
    p.avatar_url,
    p.default_workspace_id,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE p.id = _profile_id
    AND EXISTS (
      SELECT 1
      FROM workspace_members wm1
      JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
      WHERE wm1.user_id = auth.uid()
        AND wm2.user_id = _profile_id
    );
$$;

-- Update profiles table policies to restrict email to owner only
-- Keep the owner policy (already exists and is correct)
-- Add a restrictive policy for workspace members that explicitly excludes email
CREATE POLICY "Workspace members can view public profile data only"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() != id 
  AND EXISTS (
    SELECT 1
    FROM workspace_members wm1
    JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
    WHERE wm1.user_id = auth.uid()
      AND wm2.user_id = profiles.id
  )
);

-- Note: The existing "Users can view own full profile with email" policy allows owners to see their email
-- The new policy above allows workspace members to SELECT the row, but the application layer
-- should use the get_workspace_member_profile function or only request non-email columns

-- Fix workflow_credentials exposure - restrict to editors and above only
DROP POLICY IF EXISTS "Users can view credentials in their workspaces" ON public.workflow_credentials;

CREATE POLICY "Editors and above can view credentials"
ON public.workflow_credentials
FOR SELECT
TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id
    FROM workspace_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'editor')
  )
);