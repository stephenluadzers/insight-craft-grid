
-- Fix workflows table: remove public-access policy, scope to owner/workspace
DROP POLICY IF EXISTS "workflows_all_access" ON public.workflows;

CREATE POLICY "Users can view their workflows"
ON public.workflows FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR (workspace_id IS NOT NULL AND public.is_workspace_member(auth.uid(), workspace_id))
);

CREATE POLICY "Users can insert their workflows"
ON public.workflows FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (workspace_id IS NULL OR public.is_workspace_member(auth.uid(), workspace_id))
);

CREATE POLICY "Users can update their workflows"
ON public.workflows FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR (workspace_id IS NOT NULL AND public.is_workspace_member(auth.uid(), workspace_id))
)
WITH CHECK (
  auth.uid() = user_id
  OR (workspace_id IS NOT NULL AND public.is_workspace_member(auth.uid(), workspace_id))
);

CREATE POLICY "Users can delete their workflows"
ON public.workflows FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR (workspace_id IS NOT NULL AND public.has_workspace_role(auth.uid(), workspace_id, 'owner'::app_role))
  OR (workspace_id IS NOT NULL AND public.has_workspace_role(auth.uid(), workspace_id, 'admin'::app_role))
);

-- Profiles: drop the cross-member SELECT policy that exposes email column.
-- Cross-workspace member profile data should be fetched via the
-- get_workspace_member_profile() SECURITY DEFINER function which excludes email.
DROP POLICY IF EXISTS "Workspace members can view public profile data only" ON public.profiles;

-- Integration templates: require authentication (was public)
DROP POLICY IF EXISTS "Anyone can view active integration templates" ON public.integration_templates;
CREATE POLICY "Authenticated users can view active integration templates"
ON public.integration_templates FOR SELECT
TO authenticated
USING (is_active = true);

-- Suspicious activity log: restrict to workspace owners only (was owner+admin)
DROP POLICY IF EXISTS "Admins can view suspicious activity" ON public.suspicious_activity_log;
CREATE POLICY "Owners can view suspicious activity"
ON public.suspicious_activity_log FOR SELECT
TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid() AND role = 'owner'::app_role
  )
);
