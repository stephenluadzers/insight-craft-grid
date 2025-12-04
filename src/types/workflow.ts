export type NodeType = 
  | "trigger" 
  | "action" 
  | "condition" 
  | "data" 
  | "ai" 
  | "utility" 
  | "security" 
  | "storage" 
  | "agent_handoff" 
  | "connector" 
  | "checkpointer" 
  | "error_handler" 
  | "circuit_breaker" 
  | "guardrail"
  // AI Agent Types
  | "ai_orchestrator"
  | "ai_reasoner"
  | "ai_planner"
  | "ai_executor"
  | "ai_monitor"
  | "ai_communicator"
  | "ai_integrator"
  | "ai_transformer"
  | "ai_validator"
  | "ai_learner";

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface AgentGoal {
  id: string;
  description: string;
  success_criteria: string;
  priority: number;
}

export interface AgentConfig {
  enabled: boolean;
  agent_type: "assistant" | "tool_user" | "reasoner" | "planner" | "executor" | "monitor";
  model?: string;
  system_message?: string;
  user_prompt_template?: string;
  tools?: AgentTool[];
  goals?: AgentGoal[];
  constraints?: {
    max_tokens?: number;
    temperature?: number;
    max_iterations?: number;
    timeout_seconds?: number;
  };
  memory_access?: {
    read_short_term: boolean;
    write_short_term: boolean;
    read_long_term: boolean;
    write_long_term: boolean;
  };
  handoff_config?: {
    can_handoff_to: string[];
    handoff_conditions: string[];
    context_to_pass: "full" | "summary" | "relevant_only";
  };
}

export interface WorkflowNodeData {
  id: string;
  type: NodeType;
  title: string;
  description?: string;
  x: number;
  y: number;
  icon?: string;
  config?: Record<string, any>;
  agent_config?: AgentConfig;
  group?: "Core" | "AI Agents" | "Optional Connectors" | "System Services";
  priority?: number;
  color?: string;
}

// Multi-pass context extraction types
export interface ExtractedEntity {
  name: string;
  type?: string;
  role?: string;
  email?: string;
  phone?: string;
  industry?: string;
  timezone?: string;
  integration_type?: string;
  value?: string;
  entity_ref?: string;
  sku?: string;
  category?: string;
}

export interface WorkflowContext {
  entities: {
    people: ExtractedEntity[];
    organizations: ExtractedEntity[];
    locations: ExtractedEntity[];
    products: ExtractedEntity[];
    systems: ExtractedEntity[];
    identifiers: ExtractedEntity[];
  };
  intent: {
    primary: string;
    secondary: string[];
    action_verbs: string[];
    trigger_type: "scheduled" | "event" | "manual" | "webhook";
  };
  constraints: {
    time: { type: string; value: string; frequency?: string }[];
    resources: { type: string; value: string; unit?: string }[];
    compliance: string[];
    business_rules: { condition: string; action: string; priority?: string }[];
  };
  goals: {
    outcome: { description: string; success_metric?: string; priority?: number }[];
    process: { step: string; required: boolean }[];
    quality: { metric: string; threshold: string }[];
    performance: { metric: string; target: string; unit?: string }[];
  };
  dependencies: {
    data: { source: string; field: string; required: boolean }[];
    systems: { name: string; required: boolean; fallback?: string }[];
    sequence: { before: string; after: string; reason?: string }[];
    conditional: { if: string; then: string; else?: string }[];
  };
}

// Memory structures
export interface ShortTermMemory {
  session_id: string;
  created_at: string;
  expires_at: string;
  current_step: number;
  step_outputs: Record<string, any>;
  variables: Record<string, any>;
  errors: { step: string; error: string; timestamp: string }[];
  retries: Record<string, number>;
  checkpoints: { step: string; state: any; timestamp: string }[];
}

export interface LearnedPattern {
  pattern_id: string;
  description: string;
  success_rate: number;
  conditions: string[];
  recommended_action: string;
}

export interface LongTermMemory {
  workflow_id: string;
  version: number;
  first_run: string;
  last_run: string | null;
  total_runs: number;
  success_rate: number;
  learned_patterns: LearnedPattern[];
  entity_cache: Record<string, any>;
  preference_history: { key: string; value: any; timestamp: string }[];
  optimization_suggestions: { suggestion: string; impact: string; priority: number }[];
  cross_workflow_refs: { workflow_id: string; relationship: string }[];
}

export interface MemoryConfig {
  persist_short_term: boolean;
  short_term_ttl_hours: number;
  long_term_enabled: boolean;
  sync_to_database: boolean;
  encryption_required: boolean;
  share_across_workflows: boolean;
}

// Complete workflow with memory and context
export interface WorkflowWithMemory {
  id?: string;
  name?: string;
  nodes: WorkflowNodeData[];
  connections: { from: string; to: string }[];
  context?: WorkflowContext;
  short_term_memory?: ShortTermMemory;
  long_term_memory?: LongTermMemory;
  memory_config?: MemoryConfig;
  execution_strategy?: {
    event_driven: boolean;
    checkpointing: boolean;
    resumable: boolean;
    memory_enabled: boolean;
  };
  explanation?: string;
  guardrailExplanations?: string[];
  complianceStandards?: string[];
  guardrailsAdded?: number;
  riskScore?: number;
  contextTags?: string[];
  phase?: "initial" | "intermediate" | "final" | "standalone";
  estimatedComplexity?: "low" | "medium" | "high";
}

// Multi-workflow response
export interface MultiWorkflowResponse {
  workflows: WorkflowWithMemory[];
  summary: string;
  canMerge: boolean;
  suggestedMergeStrategy?: string;
}
