// Wave 1 debug/reliability types. Kept in its own file to avoid circular imports.
// Do NOT re-export these from src/types/workflow.ts.

export type StepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "retrying";

export type StepBranch = "success" | "error";

export interface RunStepLog {
  id: string;
  execution_id: string;
  workflow_id: string;
  node_id: string;
  node_type: string | null;
  status: StepStatus;
  attempt: number;
  input_payload: unknown;
  output_payload: unknown;
  error_message: string | null;
  error_stack: string | null;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  branch: StepBranch;
  created_at: string;
}

export type BackoffStrategy = "none" | "linear" | "exponential";

export interface StepRetryPolicy {
  id?: string;
  workflow_id: string;
  node_id: string;
  max_attempts: number;
  backoff_strategy: BackoffStrategy;
  initial_delay_ms: number;
  max_delay_ms: number;
  retry_on_errors: string[];
  enabled: boolean;
}

export interface FailureDiagnosis {
  id: string;
  execution_id: string;
  workflow_id: string;
  node_id: string;
  root_cause: string;
  explanation: string;
  suggested_fix: { summary?: string; patch?: { config?: Record<string, unknown> } } | null;
  confidence: number | null;
  applied: boolean | null;
  created_at: string;
}

export const RETRY_ERROR_PRESETS = [
  "timeout",
  "network",
  "5xx",
  "rate_limit",
  "validation",
  "auth",
] as const;
