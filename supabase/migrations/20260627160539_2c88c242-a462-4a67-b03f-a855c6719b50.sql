
-- Wave 5: Greenfield gap coverage

CREATE TABLE public.voice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  workflow_id uuid,
  provider text NOT NULL DEFAULT 'openai-realtime',
  voice text DEFAULT 'alloy',
  status text NOT NULL DEFAULT 'pending',
  transcript jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_sessions TO authenticated;
GRANT ALL ON public.voice_sessions TO service_role;
ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "voice_sessions workspace access" ON public.voice_sessions FOR ALL TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE TABLE public.vision_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  workflow_id uuid,
  job_type text NOT NULL, -- ocr, classify, detect, describe, extract_fields
  input_url text,
  input_storage_path text,
  result jsonb,
  status text DEFAULT 'pending',
  error text,
  cost_cents integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vision_jobs TO authenticated;
GRANT ALL ON public.vision_jobs TO service_role;
ALTER TABLE public.vision_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vision_jobs workspace access" ON public.vision_jobs FOR ALL TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE TABLE public.cdc_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  workflow_id uuid NOT NULL,
  source_type text NOT NULL, -- postgres, mysql, mongo, supabase
  connection_secret_name text NOT NULL,
  table_name text NOT NULL,
  events text[] NOT NULL DEFAULT ARRAY['insert','update','delete'],
  filter_expression text,
  last_lsn text,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cdc_triggers TO authenticated;
GRANT ALL ON public.cdc_triggers TO service_role;
ALTER TABLE public.cdc_triggers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cdc_triggers workspace access" ON public.cdc_triggers FOR ALL TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE TABLE public.payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  provider text NOT NULL, -- paypal, square, adyen, braintree, razorpay, mollie, paddle, lemonsqueezy
  display_name text NOT NULL,
  mode text DEFAULT 'sandbox',
  credentials_secret_name text NOT NULL,
  webhook_secret_name text,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_gateways TO authenticated;
GRANT ALL ON public.payment_gateways TO service_role;
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_gateways workspace access" ON public.payment_gateways FOR ALL TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE TABLE public.iot_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  protocol text NOT NULL, -- mqtt, coap, modbus, opcua, http
  broker_url text,
  topic text,
  auth_secret_name text,
  last_seen_at timestamptz,
  last_payload jsonb,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.iot_devices TO authenticated;
GRANT ALL ON public.iot_devices TO service_role;
ALTER TABLE public.iot_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "iot_devices workspace access" ON public.iot_devices FOR ALL TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE TABLE public.fine_tune_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  workflow_id uuid,
  base_model text NOT NULL,
  provider text NOT NULL DEFAULT 'openai',
  dataset_url text,
  dataset_storage_path text,
  hyperparameters jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'queued', -- queued, preparing, training, succeeded, failed, cancelled
  provider_job_id text,
  fine_tuned_model text,
  metrics jsonb DEFAULT '{}'::jsonb,
  error text,
  cost_cents integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fine_tune_jobs TO authenticated;
GRANT ALL ON public.fine_tune_jobs TO service_role;
ALTER TABLE public.fine_tune_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fine_tune_jobs workspace access" ON public.fine_tune_jobs FOR ALL TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE TABLE public.competitor_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  domain text,
  social_handles jsonb DEFAULT '{}'::jsonb,
  watch_keywords text[],
  created_by uuid,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competitor_targets TO authenticated;
GRANT ALL ON public.competitor_targets TO service_role;
ALTER TABLE public.competitor_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "competitor_targets workspace access" ON public.competitor_targets FOR ALL TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE TABLE public.competitor_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id uuid NOT NULL REFERENCES public.competitor_targets(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  source text NOT NULL, -- web, twitter, linkedin, producthunt, pricing_page, news
  snapshot jsonb NOT NULL,
  diff_summary text,
  signals jsonb DEFAULT '{}'::jsonb,
  captured_at timestamptz DEFAULT now()
);
CREATE INDEX idx_comp_snap_target_time ON public.competitor_snapshots(target_id, captured_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competitor_snapshots TO authenticated;
GRANT ALL ON public.competitor_snapshots TO service_role;
ALTER TABLE public.competitor_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "competitor_snapshots workspace access" ON public.competitor_snapshots FOR ALL TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (is_workspace_member(auth.uid(), workspace_id));
