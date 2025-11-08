-- Create webhook event subscriptions table
CREATE TABLE IF NOT EXISTS public.webhook_event_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.workflow_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(webhook_id, event_type)
);

-- Create webhook delivery logs table
CREATE TABLE IF NOT EXISTS public.webhook_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.workflow_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  http_status_code INTEGER,
  response_body JSONB,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add external_url column to workflow_webhooks if it doesn't exist
ALTER TABLE public.workflow_webhooks 
ADD COLUMN IF NOT EXISTS external_url TEXT;

-- Enable RLS
ALTER TABLE public.webhook_event_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_delivery_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for webhook_event_subscriptions
CREATE POLICY "Users can view subscriptions in their workspaces"
  ON public.webhook_event_subscriptions
  FOR SELECT
  USING (
    webhook_id IN (
      SELECT wh.id FROM public.workflow_webhooks wh
      JOIN public.workflows w ON w.id = wh.workflow_id
      JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage subscriptions in their workspaces"
  ON public.webhook_event_subscriptions
  FOR ALL
  USING (
    webhook_id IN (
      SELECT wh.id FROM public.workflow_webhooks wh
      JOIN public.workflows w ON w.id = wh.workflow_id
      JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

-- RLS Policies for webhook_delivery_logs
CREATE POLICY "Users can view delivery logs in their workspaces"
  ON public.webhook_delivery_logs
  FOR SELECT
  USING (
    webhook_id IN (
      SELECT wh.id FROM public.workflow_webhooks wh
      JOIN public.workflows w ON w.id = wh.workflow_id
      JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert delivery logs"
  ON public.webhook_delivery_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update delivery logs"
  ON public.webhook_delivery_logs
  FOR UPDATE
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_event_subscriptions_webhook_id 
  ON public.webhook_event_subscriptions(webhook_id);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_logs_webhook_id 
  ON public.webhook_delivery_logs(webhook_id);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_logs_status 
  ON public.webhook_delivery_logs(status);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_logs_created_at 
  ON public.webhook_delivery_logs(created_at DESC);