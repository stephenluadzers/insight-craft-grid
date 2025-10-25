-- Fix: Add missing INSERT policy for workspace_members to prevent privilege escalation
-- Only workspace owners can add new members
CREATE POLICY "Only workspace owners can insert members"
ON public.workspace_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_members existing
    WHERE existing.workspace_id = workspace_members.workspace_id
      AND existing.user_id = auth.uid()
      AND existing.role = 'owner'
  )
);

-- Add validation function for workflow node data
CREATE OR REPLACE FUNCTION public.validate_workflow_node_data(node_data jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Check for SQL injection patterns in node data
  IF node_data::text ~* '(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript:)' THEN
    RETURN false;
  END IF;
  
  -- Validate node data structure
  IF NOT (node_data ? 'type' AND node_data ? 'id') THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Create trigger function to validate workflow nodes before insert/update
CREATE OR REPLACE FUNCTION public.validate_workflows_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  node jsonb;
BEGIN
  IF NEW.nodes IS NOT NULL THEN
    FOR node IN SELECT * FROM jsonb_array_elements(NEW.nodes)
    LOOP
      IF NOT validate_workflow_node_data(node) THEN
        RAISE EXCEPTION 'Invalid workflow node data detected';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to validate workflows
DROP TRIGGER IF EXISTS validate_workflows_before_write ON public.workflows;
CREATE TRIGGER validate_workflows_before_write
  BEFORE INSERT OR UPDATE ON public.workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_workflows_trigger();