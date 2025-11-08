-- API Keys table for programmatic access
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- API usage tracking for rate limiting
CREATE TABLE IF NOT EXISTS public.api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Rate limit buckets
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(api_key_id, window_start)
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_keys
CREATE POLICY "Users can view their workspace API keys"
  ON public.api_keys FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage API keys"
  ON public.api_keys FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for api_usage
CREATE POLICY "Users can view their workspace API usage"
  ON public.api_usage FOR SELECT
  USING (
    api_key_id IN (
      SELECT id FROM api_keys 
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can insert usage logs"
  ON public.api_usage FOR INSERT
  WITH CHECK (true);

-- RLS Policies for api_rate_limits
CREATE POLICY "System can manage rate limits"
  ON public.api_rate_limits FOR ALL
  USING (true);

-- Indexes for performance
CREATE INDEX idx_api_keys_workspace ON public.api_keys(workspace_id);
CREATE INDEX idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON public.api_keys(is_active) WHERE is_active = true;
CREATE INDEX idx_api_usage_api_key ON public.api_usage(api_key_id);
CREATE INDEX idx_api_usage_created ON public.api_usage(created_at DESC);
CREATE INDEX idx_rate_limits_key_window ON public.api_rate_limits(api_key_id, window_start);

-- Function to generate API key
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  key_value TEXT;
BEGIN
  -- Generate a secure random key (wfapi_) with 32 random characters
  key_value := 'wfapi_' || encode(gen_random_bytes(24), 'base64');
  key_value := replace(key_value, '/', '_');
  key_value := replace(key_value, '+', '-');
  key_value := replace(key_value, '=', '');
  RETURN key_value;
END;
$$;

-- Function to check rate limit
CREATE OR REPLACE FUNCTION public.check_api_rate_limit(
  _api_key_id UUID,
  _limit INTEGER DEFAULT 1000,
  _window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_window TIMESTAMP WITH TIME ZONE;
  current_count INTEGER;
BEGIN
  -- Calculate current window
  current_window := date_trunc('hour', now()) + 
    (floor(extract(minute from now()) / _window_minutes) * _window_minutes || ' minutes')::INTERVAL;
  
  -- Get or create rate limit record
  INSERT INTO public.api_rate_limits (api_key_id, window_start, request_count)
  VALUES (_api_key_id, current_window, 1)
  ON CONFLICT (api_key_id, window_start)
  DO UPDATE SET request_count = api_rate_limits.request_count + 1
  RETURNING request_count INTO current_count;
  
  -- Check if limit exceeded
  RETURN current_count <= _limit;
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- Cleanup old usage logs (keep 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_api_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.api_usage
  WHERE created_at < now() - interval '90 days';
  
  DELETE FROM public.api_rate_limits
  WHERE window_start < now() - interval '7 days';
END;
$$;