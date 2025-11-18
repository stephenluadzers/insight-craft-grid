export type NodeType = "trigger" | "action" | "condition" | "data" | "ai" | "utility" | "security" | "storage" | "agent_handoff" | "connector" | "checkpointer" | "error_handler" | "circuit_breaker" | "guardrail";

export interface WorkflowNodeData {
  id: string;
  type: NodeType;
  title: string;
  description?: string;
  x: number;
  y: number;
  icon?: string;
  config?: Record<string, any>;
}
