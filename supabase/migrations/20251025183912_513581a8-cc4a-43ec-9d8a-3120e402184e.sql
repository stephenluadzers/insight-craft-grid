-- Create table for tracking login attempts server-side
CREATE TABLE IF NOT EXISTS public.auth_rate_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_attempt timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on auth_rate_limit
ALTER TABLE public.auth_rate_limit ENABLE ROW LEVEL SECURITY;

-- Policy: Only allow service role to access (used by edge function)
CREATE POLICY "Service role can manage rate limits"
ON public.auth_rate_limit
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_auth_rate_limit_email ON public.auth_rate_limit(email);

-- Function to clean up old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_auth_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.auth_rate_limit
  WHERE last_attempt < now() - interval '24 hours';
END;
$$;