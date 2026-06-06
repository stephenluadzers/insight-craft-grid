-- Wave 3: Power-User Canvas

-- Sub-workflow links
CREATE TABLE public.subworkflow_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  child_workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  parent_node_id TEXT NOT NULL,
  input_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subworkflow_links TO authenticated;
GRANT ALL ON public.subworkflow_links TO service_role;
ALTER TABLE public.subworkflow_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage subworkflow links" ON public.subworkflow_links
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workflows w JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id WHERE w.id = parent_workflow_id AND wm.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workflows w JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id WHERE w.id = parent_workflow_id AND wm.user_id = auth.uid()));
CREATE TRIGGER set_subworkflow_links_updated_at BEFORE UPDATE ON public.subworkflow_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Workflow data stores (key-value scratch)
CREATE TABLE public.flow_data_stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  store_key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  ttl_seconds INTEGER,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, store_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flow_data_stores TO authenticated;
GRANT ALL ON public.flow_data_stores TO service_role;
ALTER TABLE public.flow_data_stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage data stores" ON public.flow_data_stores
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workflows w JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id WHERE w.id = workflow_id AND wm.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workflows w JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id WHERE w.id = workflow_id AND wm.user_id = auth.uid()));
CREATE TRIGGER set_flow_data_stores_updated_at BEFORE UPDATE ON public.flow_data_stores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Published workflow APIs
CREATE TABLE public.published_workflow_apis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  method TEXT NOT NULL DEFAULT 'POST' CHECK (method IN ('GET','POST','PUT','DELETE')),
  auth_required BOOLEAN NOT NULL DEFAULT true,
  api_key_hash TEXT,
  input_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  request_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.published_workflow_apis TO authenticated;
GRANT ALL ON public.published_workflow_apis TO service_role;
ALTER TABLE public.published_workflow_apis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage published APIs" ON public.published_workflow_apis
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workflows w JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id WHERE w.id = workflow_id AND wm.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workflows w JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id WHERE w.id = workflow_id AND wm.user_id = auth.uid()));
CREATE TRIGGER set_published_workflow_apis_updated_at BEFORE UPDATE ON public.published_workflow_apis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Canvas annotations (sticky notes & group frames)
CREATE TABLE public.canvas_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('sticky','group')),
  position JSONB NOT NULL DEFAULT '{"x":0,"y":0}'::jsonb,
  size JSONB NOT NULL DEFAULT '{"width":240,"height":160}'::jsonb,
  content TEXT,
  color TEXT NOT NULL DEFAULT 'amber',
  member_node_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.canvas_annotations TO authenticated;
GRANT ALL ON public.canvas_annotations TO service_role;
ALTER TABLE public.canvas_annotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage canvas annotations" ON public.canvas_annotations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workflows w JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id WHERE w.id = workflow_id AND wm.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workflows w JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id WHERE w.id = workflow_id AND wm.user_id = auth.uid()));
CREATE TRIGGER set_canvas_annotations_updated_at BEFORE UPDATE ON public.canvas_annotations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();