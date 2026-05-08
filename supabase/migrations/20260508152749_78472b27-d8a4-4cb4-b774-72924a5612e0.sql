CREATE TABLE public.learned_node_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  raw_type TEXT NOT NULL UNIQUE,
  mapped_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  config_template JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'ai_enrichment',
  usage_count INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_learned_node_types_raw_type ON public.learned_node_types(raw_type);

ALTER TABLE public.learned_node_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read learned node types"
ON public.learned_node_types FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert learned node types"
ON public.learned_node_types FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update learned node types"
ON public.learned_node_types FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER update_learned_node_types_updated_at
BEFORE UPDATE ON public.learned_node_types
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();