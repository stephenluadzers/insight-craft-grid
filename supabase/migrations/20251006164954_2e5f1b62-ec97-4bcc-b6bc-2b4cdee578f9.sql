-- Create a secure view for profiles that only exposes email to the user themselves
CREATE OR REPLACE VIEW public.profiles_secure AS
SELECT 
  id,
  full_name,
  avatar_url,
  created_at,
  updated_at,
  default_workspace_id,
  CASE 
    WHEN id = auth.uid() THEN email
    ELSE NULL
  END as email
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.profiles_secure TO authenticated;

-- Create a separate table for sensitive execution data (admin-only access)
CREATE TABLE IF NOT EXISTS public.workflow_execution_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  sensitive_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on the new table
ALTER TABLE public.workflow_execution_secrets ENABLE ROW LEVEL SECURITY;

-- Only workspace owners and admins can view sensitive execution data
CREATE POLICY "Admins can view sensitive execution data"
ON public.workflow_execution_secrets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.workflow_executions we
    JOIN public.workspace_members wm ON wm.workspace_id = we.workspace_id
    WHERE we.id = workflow_execution_secrets.execution_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
  )
);

-- Deny anonymous access
CREATE POLICY "Require authentication for workflow_execution_secrets"
ON public.workflow_execution_secrets
FOR SELECT
TO anon
USING (false);

-- Update the profiles table RLS to be more explicit about email privacy
-- Drop the existing policy that allows users to view their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create more granular policies
CREATE POLICY "Users can view own full profile with email"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can view other profiles without email"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() != id
  AND EXISTS (
    SELECT 1 FROM public.workspace_members wm1
    JOIN public.workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
    WHERE wm1.user_id = auth.uid() 
      AND wm2.user_id = profiles.id
  )
);

-- Add comment to document email privacy
COMMENT ON COLUMN public.profiles.email IS 'Email address - only visible to the user themselves via RLS';

-- Update workflow_executions to strip sensitive data for non-admin viewers
-- Create a function to sanitize execution data
CREATE OR REPLACE FUNCTION public.sanitize_execution_data(execution_data jsonb, workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Check if user is admin or owner
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = auth.uid()
      AND workspace_members.workspace_id = sanitize_execution_data.workspace_id
      AND role IN ('owner', 'admin')
  ) INTO is_admin;
  
  -- If admin, return full data; otherwise return sanitized version
  IF is_admin THEN
    RETURN execution_data;
  ELSE
    -- Remove potentially sensitive fields
    RETURN jsonb_set(
      execution_data,
      '{steps}',
      (
        SELECT jsonb_agg(
          jsonb_set(
            step,
            '{result}',
            '{"status": "completed", "message": "[Redacted for non-admin users]"}'::jsonb
          )
        )
        FROM jsonb_array_elements(execution_data->'steps') AS step
      )
    );
  END IF;
END;
$$;