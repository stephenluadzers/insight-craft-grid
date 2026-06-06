CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge bases for RAG
CREATE TABLE public.knowledge_bases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  embedding_model text NOT NULL DEFAULT 'google/text-embedding-004',
  chunk_size integer NOT NULL DEFAULT 800,
  chunk_overlap integer NOT NULL DEFAULT 100,
  document_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_bases TO authenticated;
GRANT ALL ON public.knowledge_bases TO service_role;
ALTER TABLE public.knowledge_bases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members view kbs" ON public.knowledge_bases FOR SELECT TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace editors manage kbs" ON public.knowledge_bases FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = knowledge_bases.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin','editor')))
WITH CHECK (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = knowledge_bases.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin','editor')));

CREATE TRIGGER set_kb_updated_at BEFORE UPDATE ON public.knowledge_bases
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- Document chunks
CREATE TABLE public.knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id uuid NOT NULL REFERENCES public.knowledge_bases(id) ON DELETE CASCADE,
  title text,
  source text,
  chunk_index integer NOT NULL DEFAULT 0,
  content text NOT NULL,
  embedding vector(768),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_kd_kb ON public.knowledge_documents(knowledge_base_id);
CREATE INDEX idx_kd_embedding ON public.knowledge_documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_documents TO authenticated;
GRANT ALL ON public.knowledge_documents TO service_role;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view kb docs" ON public.knowledge_documents FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.knowledge_bases kb WHERE kb.id = knowledge_documents.knowledge_base_id AND public.is_workspace_member(auth.uid(), kb.workspace_id)));
CREATE POLICY "Editors manage kb docs" ON public.knowledge_documents FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.knowledge_bases kb JOIN public.workspace_members wm ON wm.workspace_id = kb.workspace_id WHERE kb.id = knowledge_documents.knowledge_base_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin','editor')))
WITH CHECK (EXISTS (SELECT 1 FROM public.knowledge_bases kb JOIN public.workspace_members wm ON wm.workspace_id = kb.workspace_id WHERE kb.id = knowledge_documents.knowledge_base_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin','editor')));

-- RPC for similarity search
CREATE OR REPLACE FUNCTION public.match_knowledge_documents(
  query_embedding vector(768),
  kb_id uuid,
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0.5
)
RETURNS TABLE(id uuid, title text, source text, content text, similarity float)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT kd.id, kd.title, kd.source, kd.content,
         1 - (kd.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_documents kd
  WHERE kd.knowledge_base_id = kb_id
    AND kd.embedding IS NOT NULL
    AND 1 - (kd.embedding <=> query_embedding) > match_threshold
  ORDER BY kd.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Test cases
CREATE TABLE public.workflow_test_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'happy_path' CHECK (category IN ('happy_path','edge_case','error_case','load')),
  input_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  expected_output jsonb,
  assertions jsonb DEFAULT '[]'::jsonb,
  ai_generated boolean NOT NULL DEFAULT false,
  last_run_at timestamptz,
  last_status text CHECK (last_status IN ('passed','failed','error','skipped')),
  last_actual_output jsonb,
  last_duration_ms integer,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_test_cases_wf ON public.workflow_test_cases(workflow_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_test_cases TO authenticated;
GRANT ALL ON public.workflow_test_cases TO service_role;
ALTER TABLE public.workflow_test_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view test cases" ON public.workflow_test_cases FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.workflows w WHERE w.id = workflow_test_cases.workflow_id AND public.is_workspace_member(auth.uid(), w.workspace_id)));
CREATE POLICY "Editors manage test cases" ON public.workflow_test_cases FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.workflows w JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id WHERE w.id = workflow_test_cases.workflow_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin','editor')))
WITH CHECK (EXISTS (SELECT 1 FROM public.workflows w JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id WHERE w.id = workflow_test_cases.workflow_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin','editor')));

CREATE TRIGGER set_tc_updated_at BEFORE UPDATE ON public.workflow_test_cases
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- Multi-agent orchestrations
CREATE TABLE public.agent_orchestrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  supervisor_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  worker_configs jsonb NOT NULL DEFAULT '[]'::jsonb,
  mode text NOT NULL DEFAULT 'sequential' CHECK (mode IN ('sequential','hierarchical','parallel')),
  max_iterations integer NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'idle' CHECK (status IN ('idle','running','completed','failed')),
  last_result jsonb,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, node_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_orchestrations TO authenticated;
GRANT ALL ON public.agent_orchestrations TO service_role;
ALTER TABLE public.agent_orchestrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view orchestrations" ON public.agent_orchestrations FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.workflows w WHERE w.id = agent_orchestrations.workflow_id AND public.is_workspace_member(auth.uid(), w.workspace_id)));
CREATE POLICY "Editors manage orchestrations" ON public.agent_orchestrations FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.workflows w JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id WHERE w.id = agent_orchestrations.workflow_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin','editor')))
WITH CHECK (EXISTS (SELECT 1 FROM public.workflows w JOIN public.workspace_members wm ON wm.workspace_id = w.workspace_id WHERE w.id = agent_orchestrations.workflow_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin','editor')));

CREATE TRIGGER set_orch_updated_at BEFORE UPDATE ON public.agent_orchestrations
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();