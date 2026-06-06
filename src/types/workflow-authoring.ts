// Wave 2 authoring types. Standalone file — no imports from src/types/workflow.ts.

export type TestCaseCategory = "happy_path" | "edge_case" | "error_case" | "load";
export type TestStatus = "passed" | "failed" | "error" | "skipped";

export interface WorkflowTestCase {
  id: string;
  workflow_id: string;
  name: string;
  description: string | null;
  category: TestCaseCategory;
  input_payload: Record<string, unknown>;
  expected_output: Record<string, unknown> | null;
  assertions: Array<{ path: string; op: string; value?: unknown }>;
  ai_generated: boolean;
  last_run_at: string | null;
  last_status: TestStatus | null;
  last_actual_output: Record<string, unknown> | null;
  last_duration_ms: number | null;
  created_at: string;
}

export interface KnowledgeBase {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  embedding_model: string;
  chunk_size: number;
  chunk_overlap: number;
  document_count: number;
  created_at: string;
}

export type OrchestrationMode = "sequential" | "hierarchical" | "parallel";

export interface AgentWorker {
  name: string;
  role: string;
  system_prompt: string;
  model?: string;
  tools?: string[];
}

export interface AgentOrchestration {
  id: string;
  workflow_id: string;
  node_id: string;
  supervisor_config: {
    name?: string;
    system_prompt?: string;
    model?: string;
  };
  worker_configs: AgentWorker[];
  mode: OrchestrationMode;
  max_iterations: number;
  status: "idle" | "running" | "completed" | "failed";
  last_result: unknown;
  last_run_at: string | null;
}

/** "deterministic" runs the node as a normal workflow step.
 *  "agent" runs it via an LLM that can call tools and reason. */
export type NodeExecutionMode = "deterministic" | "agent";
