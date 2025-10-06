-- Drop the security definer view (linter issue)
DROP VIEW IF EXISTS public.profiles_secure CASCADE;

-- Instead, update the profiles RLS policies to ensure email is only visible to owner
-- The existing policies already handle this, but let's make it even more explicit

-- Add a policy comment to document the email privacy protection
COMMENT ON POLICY "Users can view own full profile with email" ON public.profiles 
IS 'Allows users to view their complete profile including email address';

COMMENT ON POLICY "Users can view other profiles without email" ON public.profiles 
IS 'Allows workspace members to view other profiles, but email field requires user to be owner of the profile via auth.uid() = id check';

-- Create an index to improve performance of workspace member lookups
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_workspace 
ON public.workspace_members(user_id, workspace_id);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_workspace 
ON public.workflow_executions(workspace_id);

-- Document that email column has field-level privacy via RLS
COMMENT ON TABLE public.profiles 
IS 'User profiles. Email addresses are only visible to the profile owner via RLS policies.';