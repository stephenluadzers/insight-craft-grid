-- Add missing columns to workflows table
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS created_by UUID;

-- Update RLS policies to be less restrictive for now
DROP POLICY IF EXISTS "workflows_select_policy" ON public.workflows;
DROP POLICY IF EXISTS "workflows_insert_policy" ON public.workflows;
DROP POLICY IF EXISTS "workflows_update_policy" ON public.workflows;
DROP POLICY IF EXISTS "workflows_delete_policy" ON public.workflows;

-- Create simpler RLS policies
CREATE POLICY "workflows_all_access" ON public.workflows
  FOR ALL USING (true) WITH CHECK (true);