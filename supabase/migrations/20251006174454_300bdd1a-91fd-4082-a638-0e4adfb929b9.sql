-- Block all anonymous access to workflow_execution_secrets table
-- This explicitly denies the 'anon' role (unauthenticated users) from accessing sensitive credential data

CREATE POLICY "Block anonymous access to sensitive secrets"
ON public.workflow_execution_secrets
FOR ALL
TO anon
USING (false);

-- Add documentation comment
COMMENT ON POLICY "Block anonymous access to sensitive secrets" ON public.workflow_execution_secrets 
IS 'Explicitly blocks all anonymous/unauthenticated access to API keys, tokens, and credentials stored in this table.';