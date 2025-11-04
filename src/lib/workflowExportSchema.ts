import { z } from 'zod';

/**
 * FlowFuse Export Schema v1
 * Universal workflow export specification for cross-platform deployment
 */

// ========================================
// 1. NODE STRUCTURE
// ========================================

export const NodeTypeSchema = z.enum([
  'trigger',
  'action',
  'condition',
  'data',
  'ai',
  'connector',
  'error_handler',
  'validator',
  'agent_handoff',
  'checkpointer',
  'circuit_breaker',
  'rate_limiter',
  'health_monitor'
]);

export const NodeGroupSchema = z.enum([
  'Core',
  'Optional Connectors',
  'System Services'
]);

export const CircuitBreakerConfigSchema = z.object({
  failure_threshold: z.number().int().min(1).default(5),
  reset_timeout: z.number().int().min(1000).default(60000),
  half_open_max_calls: z.number().int().min(1).default(3)
});

export const NodeConfigSchema = z.object({
  connector: z.string().optional(),
  optional: z.boolean().default(false),
  system_service: z.boolean().default(false),
  required: z.boolean().default(false),
  justification: z.string().optional(),
  dependencies: z.array(z.string()).default([]),
  trigger_conditions: z.string().optional(),
  handoff_to: z.string().optional(),
  context_carryover: z.array(z.string()).default([]),
  retries: z.number().int().min(0).max(10).default(3),
  retry_strategy: z.enum(['exponential_backoff', 'linear', 'fixed']).default('exponential_backoff'),
  timeout: z.number().int().min(1000).max(300000).default(30000),
  circuit_breaker: CircuitBreakerConfigSchema.optional(),
  fallback: z.string().optional(),
  checkpoint: z.boolean().default(false),
  health_check: z.string().url().optional(),
  rate_limit: z.object({
    max_requests: z.number().int().min(1),
    window_ms: z.number().int().min(1000)
  }).optional()
});

export const WorkflowNodeSchema = z.object({
  id: z.string().trim().min(1).max(100),
  type: NodeTypeSchema,
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  group: NodeGroupSchema,
  priority: z.number().min(0.1).max(1.0),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  x: z.number().int(),
  y: z.number().int(),
  config: NodeConfigSchema
});

// ========================================
// 2. CONNECTION MAPPING
// ========================================

export const ConnectionTypeSchema = z.enum([
  'data_flow',      // Normal data passing
  'error_handler',  // Error routing
  'fallback',       // Circuit breaker fallback
  'agent_handoff',  // Multi-agent transition
  'checkpoint',     // State persistence
  'conditional'     // Branch/decision
]);

export const ConnectionSchema = z.object({
  from: z.string().trim().min(1),
  to: z.string().trim().min(1),
  type: ConnectionTypeSchema.default('data_flow'),
  condition: z.string().optional(), // For conditional connections
  priority: z.number().min(0).max(1).default(0.5),
  label: z.string().max(100).optional()
});

// ========================================
// 3. ENVIRONMENT TEMPLATES
// ========================================

export const EnvironmentVariableSchema = z.object({
  key: z.string().trim().min(1).max(100).regex(/^[A-Z_][A-Z0-9_]*$/),
  description: z.string().trim().max(500),
  required: z.boolean().default(true),
  default_value: z.string().optional(),
  sensitive: z.boolean().default(false),
  validation: z.object({
    type: z.enum(['string', 'url', 'email', 'port', 'api_key', 'jwt']),
    pattern: z.string().optional(),
    min_length: z.number().int().optional(),
    max_length: z.number().int().optional()
  }).optional()
});

export const EnvironmentTemplateSchema = z.object({
  platform: z.enum(['n8n', 'make', 'python', 'typescript', 'docker', 'github-actions', 'supabase-function']),
  variables: z.array(EnvironmentVariableSchema),
  secrets: z.array(z.string()),
  optional_features: z.record(z.object({
    enabled: z.boolean().default(false),
    required_env: z.array(z.string())
  }))
});

// ========================================
// 4. VALIDATION REQUIREMENTS
// ========================================

export const ValidationRuleSchema = z.object({
  rule_id: z.string().trim().min(1),
  severity: z.enum(['error', 'warning', 'info']),
  message: z.string().trim().max(500),
  validator: z.function().args(z.any()).returns(z.boolean())
});

export const WorkflowValidationSchema = z.object({
  has_trigger: z.boolean(),
  has_terminal_node: z.boolean(),
  no_cycles: z.boolean(),
  all_dependencies_exist: z.boolean(),
  all_connections_valid: z.boolean(),
  required_env_vars_documented: z.boolean(),
  circuit_breakers_configured: z.boolean(),
  error_handlers_present: z.boolean(),
  max_execution_time: z.number().int().min(1000).max(3600000),
  max_node_count: z.number().int().min(1).max(500)
});

// ========================================
// 5. DEPLOYMENT MANIFEST
// ========================================

export const DependencySchema = z.object({
  name: z.string().trim().min(1),
  type: z.enum(['api', 'database', 'service', 'library', 'agent']),
  version: z.string().optional(),
  required: z.boolean().default(true),
  priority: z.number().min(0).max(1),
  health_check: z.string().url().optional(),
  fallback: z.string().optional()
});

export const ArchitecturalFeaturesSchema = z.object({
  event_driven: z.boolean().default(true),
  state_management: z.boolean().default(true),
  checkpointing: z.boolean().default(true),
  circuit_breakers: z.boolean().default(true),
  rate_limiting: z.boolean().default(true),
  multi_agent: z.boolean().default(false),
  resumable: z.boolean().default(true),
  idempotent: z.boolean().default(true)
});

export const DeploymentManifestSchema = z.object({
  schema_version: z.literal('1.0.0'),
  workflow_name: z.string().trim().min(1).max(200),
  workflow_id: z.string().uuid().optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().trim().max(1000).optional(),
  author: z.string().trim().max(200).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  
  // Platform configuration
  platforms: z.array(z.enum(['n8n', 'make', 'python', 'typescript', 'docker', 'github-actions', 'supabase-function'])),
  default_platform: z.string(),
  
  // Architecture
  architecture: ArchitecturalFeaturesSchema,
  
  // Nodes and connections
  node_count: z.object({
    core: z.number().int().min(1),
    optional: z.number().int().min(0),
    system: z.number().int().min(0),
    total: z.number().int().min(1)
  }),
  
  // Dependencies with priority ranking
  dependencies: z.array(DependencySchema),
  
  // Entry points
  entry_point: z.string().trim().min(1),
  health_check_endpoint: z.string().optional(),
  
  // Monitoring
  monitoring: z.object({
    enabled: z.boolean().default(true),
    metrics: z.array(z.string()),
    log_level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    telemetry_endpoint: z.string().url().optional()
  }),
  
  // Resource requirements
  resources: z.object({
    estimated_memory_mb: z.number().int().min(128),
    estimated_cpu_cores: z.number().min(0.1),
    estimated_cost_per_1k_executions: z.number().min(0),
    max_concurrent_executions: z.number().int().min(1)
  }).optional()
});

// ========================================
// 6. COMPLETE EXPORT BUNDLE
// ========================================

export const ExecutionStrategySchema = z.object({
  event_driven: z.boolean().default(true),
  checkpointing: z.boolean().default(true),
  resumable: z.boolean().default(true),
  max_retries: z.number().int().min(0).max(10).default(3),
  timeout: z.number().int().min(1000).max(3600000).default(300000)
});

export const FlowFuseExportBundleSchema = z.object({
  // Core workflow definition
  nodes: z.array(WorkflowNodeSchema).min(1),
  connections: z.array(ConnectionSchema).min(0),
  execution_strategy: ExecutionStrategySchema,
  explanation: z.string().trim().max(5000).optional(),
  
  // Validation
  validation: WorkflowValidationSchema.optional(),
  
  // Environment configuration
  environment: z.array(EnvironmentTemplateSchema).optional(),
  
  // Deployment manifest
  manifest: DeploymentManifestSchema
});

// ========================================
// 7. TYPE EXPORTS
// ========================================

export type NodeType = z.infer<typeof NodeTypeSchema>;
export type NodeGroup = z.infer<typeof NodeGroupSchema>;
export type NodeConfig = z.infer<typeof NodeConfigSchema>;
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;
export type Connection = z.infer<typeof ConnectionSchema>;
export type ConnectionType = z.infer<typeof ConnectionTypeSchema>;
export type EnvironmentVariable = z.infer<typeof EnvironmentVariableSchema>;
export type EnvironmentTemplate = z.infer<typeof EnvironmentTemplateSchema>;
export type ValidationRule = z.infer<typeof ValidationRuleSchema>;
export type WorkflowValidation = z.infer<typeof WorkflowValidationSchema>;
export type Dependency = z.infer<typeof DependencySchema>;
export type ArchitecturalFeatures = z.infer<typeof ArchitecturalFeaturesSchema>;
export type DeploymentManifest = z.infer<typeof DeploymentManifestSchema>;
export type ExecutionStrategy = z.infer<typeof ExecutionStrategySchema>;
export type FlowFuseExportBundle = z.infer<typeof FlowFuseExportBundleSchema>;

// ========================================
// 8. VALIDATION UTILITIES
// ========================================

export class ExportValidator {
  /**
   * Validate a complete export bundle
   */
  static validateBundle(bundle: unknown): { success: boolean; errors?: string[] } {
    const result = FlowFuseExportBundleSchema.safeParse(bundle);
    if (result.success) {
      return { success: true };
    }
    return {
      success: false,
      errors: result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
    };
  }

  /**
   * Validate workflow has no cycles
   */
  static validateNoCycles(nodes: WorkflowNode[], connections: Connection[]): boolean {
    const adjacency = new Map<string, Set<string>>();
    
    // Build adjacency list
    nodes.forEach(node => adjacency.set(node.id, new Set()));
    connections.forEach(conn => {
      adjacency.get(conn.from)?.add(conn.to);
    });
    
    // DFS cycle detection
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      
      const neighbors = adjacency.get(nodeId) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }
      
      recursionStack.delete(nodeId);
      return false;
    };
    
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (hasCycle(node.id)) return false;
      }
    }
    
    return true;
  }

  /**
   * Validate all connections reference existing nodes
   */
  static validateConnections(nodes: WorkflowNode[], connections: Connection[]): boolean {
    const nodeIds = new Set(nodes.map(n => n.id));
    return connections.every(conn => 
      nodeIds.has(conn.from) && nodeIds.has(conn.to)
    );
  }

  /**
   * Validate workflow has at least one trigger node
   */
  static validateHasTrigger(nodes: WorkflowNode[]): boolean {
    return nodes.some(node => node.type === 'trigger');
  }

  /**
   * Validate workflow has terminal nodes (no outgoing connections)
   */
  static validateHasTerminalNode(nodes: WorkflowNode[], connections: Connection[]): boolean {
    const nodesWithOutgoing = new Set(connections.map(c => c.from));
    return nodes.some(node => !nodesWithOutgoing.has(node.id));
  }

  /**
   * Generate comprehensive validation report
   */
  static generateValidationReport(bundle: FlowFuseExportBundle): WorkflowValidation {
    return {
      has_trigger: this.validateHasTrigger(bundle.nodes),
      has_terminal_node: this.validateHasTerminalNode(bundle.nodes, bundle.connections),
      no_cycles: this.validateNoCycles(bundle.nodes, bundle.connections),
      all_dependencies_exist: bundle.nodes.every(node => 
        node.config.dependencies.every(dep => 
          bundle.nodes.some(n => n.id === dep)
        )
      ),
      all_connections_valid: this.validateConnections(bundle.nodes, bundle.connections),
      required_env_vars_documented: bundle.environment?.every(env => 
        env.variables.filter(v => v.required).length > 0
      ) ?? true,
      circuit_breakers_configured: bundle.nodes.some(node => 
        node.type === 'circuit_breaker' || node.config.circuit_breaker !== undefined
      ),
      error_handlers_present: bundle.nodes.some(node => node.type === 'error_handler'),
      max_execution_time: bundle.execution_strategy.timeout,
      max_node_count: bundle.nodes.length
    };
  }
}

// ========================================
// 9. SCHEMA DOCUMENTATION
// ========================================

export const SCHEMA_DOCUMENTATION = {
  version: '1.0.0',
  description: 'FlowFuse Export Schema - Universal workflow export specification',
  features: [
    'Cross-platform deployment support',
    'Comprehensive validation',
    'Environment configuration management',
    'Dependency tracking with priorities',
    'Architectural feature flags',
    'Health monitoring integration',
    'Resource estimation'
  ],
  supported_platforms: ['n8n', 'make', 'python', 'typescript', 'docker', 'github-actions', 'supabase-function'],
  architectural_patterns: [
    'Event-driven execution (OpenDevin)',
    'State management with checkpointing (LangGraph)',
    'Multi-agent handoffs (Autogen Studio)',
    'Circuit breakers and fault tolerance',
    'Rate limiting and defensive programming'
  ]
};
