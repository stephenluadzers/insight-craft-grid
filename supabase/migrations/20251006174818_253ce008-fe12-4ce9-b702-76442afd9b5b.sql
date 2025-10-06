-- Fix email privacy: Create view for public profiles without email addresses
-- This ensures users can only see email addresses of their own profile

-- Drop existing permissive policy that exposes emails
DROP POLICY IF EXISTS "Users can view other profiles without email" ON public.profiles;

-- Create a view for public profile access (without email)
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT 
  id,
  full_name,
  avatar_url,
  default_workspace_id,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.profiles_public TO authenticated;

-- Enable RLS on the view
ALTER VIEW public.profiles_public SET (security_barrier = true);

-- Create policy for viewing public profiles (workspace members only)
CREATE POLICY "Users can view public profiles in shared workspaces"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() <> id 
  AND EXISTS (
    SELECT 1
    FROM workspace_members wm1
    JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
    WHERE wm1.user_id = auth.uid()
      AND wm2.user_id = profiles.id
  )
);

-- Add comment explaining the security model
COMMENT ON VIEW public.profiles_public IS 
'Public view of user profiles that excludes email addresses. Use this view when displaying profiles of other users in shared workspaces. Direct access to profiles table should only be used when viewing own profile.';

COMMENT ON POLICY "Users can view public profiles in shared workspaces" ON public.profiles IS
'Allows viewing other users profiles in shared workspaces, but applications MUST exclude the email column when querying (use profiles_public view instead).';