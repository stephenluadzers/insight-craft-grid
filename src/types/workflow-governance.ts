/** Wave 4 — Governance & observability shared types. */

export type Environment = "dev" | "staging" | "prod";
export type GovernanceSeverity = "info" | "warning" | "critical";

export interface WorkflowEnvironment {
  id: string;
  workflow_id: string;
  workspace_id: string;
  environment: Environment;
  version_id: string | null;
  promoted_by: string | null;
  promoted_at: string;
  config_overrides: Record<string, unknown>;
  is_active: boolean;
}

export interface StepCostMetric {
  id: string;
  workflow_id: string;
  execution_id: string | null;
  node_id: string;
  node_type: string | null;
  provider: string | null;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  latency_ms: number;
  recorded_at: string;
}

export interface GovernanceEvent {
  id: string;
  workspace_id: string;
  workflow_id: string | null;
  actor_id: string | null;
  event_type: string;
  severity: GovernanceSeverity;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PiiScrubRule {
  id: string;
  workspace_id: string;
  name: string;
  pattern: string;
  replacement: string;
  is_active: boolean;
}
