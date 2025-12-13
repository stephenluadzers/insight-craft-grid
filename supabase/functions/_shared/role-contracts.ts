// Explicit Role Contracts for Enterprise/Government-Ready Workflows
// Defines formal agent roles and enforces which nodes can do what

export type AgentRole = 
  | 'analyzer'      // Can read, analyze, generate insights - NO write/execute
  | 'executor'      // Can execute actions, write data - requires analyzer approval
  | 'auditor'       // Can read all, log all, alert - NO modify
  | 'notifier'      // Can send notifications only - NO data access
  | 'orchestrator'  // Can coordinate other agents - limited direct action
  | 'validator'     // Can validate/verify - NO execute
  | 'transformer'   // Can transform data - NO external calls
  | 'guardian';     // Can block/approve - ultimate veto power

export interface RolePermissions {
  canReadData: boolean;
  canWriteData: boolean;
  canExecuteExternal: boolean;
  canModifyWorkflow: boolean;
  canAccessPII: boolean;
  canApproveActions: boolean;
  canBlockActions: boolean;
  canSendNotifications: boolean;
  canCallAI: boolean;
  canAccessSecrets: boolean;
  maxRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresApprovalFrom: AgentRole[];
  canDelegateTo: AgentRole[];
}

export interface RoleContract {
  role: AgentRole;
  permissions: RolePermissions;
  description: string;
  constraints: string[];
  auditRequirements: string[];
  escalationPath: AgentRole[];
}

export const ROLE_CONTRACTS: Record<AgentRole, RoleContract> = {
  analyzer: {
    role: 'analyzer',
    permissions: {
      canReadData: true,
      canWriteData: false,
      canExecuteExternal: false,
      canModifyWorkflow: false,
      canAccessPII: true, // With logging
      canApproveActions: false,
      canBlockActions: false,
      canSendNotifications: false,
      canCallAI: true,
      canAccessSecrets: false,
      maxRiskLevel: 'medium',
      requiresApprovalFrom: [],
      canDelegateTo: ['notifier']
    },
    description: 'Analyzes data and generates insights. Read-only access with AI capabilities.',
    constraints: [
      'Cannot write or modify any data',
      'Cannot execute external actions',
      'All PII access must be logged',
      'Cannot access credentials or secrets'
    ],
    auditRequirements: [
      'Log all data access',
      'Log all AI calls with prompts/responses',
      'Log analysis duration and scope'
    ],
    escalationPath: ['orchestrator', 'guardian']
  },

  executor: {
    role: 'executor',
    permissions: {
      canReadData: true,
      canWriteData: true,
      canExecuteExternal: true,
      canModifyWorkflow: false,
      canAccessPII: true,
      canApproveActions: false,
      canBlockActions: false,
      canSendNotifications: true,
      canCallAI: true,
      canAccessSecrets: true, // Required for API calls
      maxRiskLevel: 'high',
      requiresApprovalFrom: ['validator', 'guardian'],
      canDelegateTo: ['notifier']
    },
    description: 'Executes actions and writes data. Requires pre-approval for high-risk operations.',
    constraints: [
      'High-risk actions require validator approval',
      'Critical actions require guardian approval',
      'Must log all external API calls',
      'Cannot modify workflow structure',
      'Must respect rate limits'
    ],
    auditRequirements: [
      'Log all write operations',
      'Log all external API calls with response codes',
      'Log credential access (not values)',
      'Track execution time and resources'
    ],
    escalationPath: ['guardian']
  },

  auditor: {
    role: 'auditor',
    permissions: {
      canReadData: true,
      canWriteData: false, // Only to audit logs
      canExecuteExternal: false,
      canModifyWorkflow: false,
      canAccessPII: true, // For compliance verification
      canApproveActions: false,
      canBlockActions: true, // Can flag for review
      canSendNotifications: true, // Alert on violations
      canCallAI: false,
      canAccessSecrets: false,
      maxRiskLevel: 'critical', // Can observe critical operations
      requiresApprovalFrom: [],
      canDelegateTo: []
    },
    description: 'Monitors all operations for compliance. Read-only with alert capabilities.',
    constraints: [
      'Cannot modify any data except audit logs',
      'Cannot execute any actions',
      'Must maintain immutable audit trail',
      'Cannot be disabled during workflow execution'
    ],
    auditRequirements: [
      'Self-audit all operations',
      'Maintain tamper-proof logs',
      'Report all compliance violations',
      'Generate periodic compliance reports'
    ],
    escalationPath: ['guardian']
  },

  notifier: {
    role: 'notifier',
    permissions: {
      canReadData: false, // Only receives formatted messages
      canWriteData: false,
      canExecuteExternal: true, // Only notification APIs
      canModifyWorkflow: false,
      canAccessPII: false,
      canApproveActions: false,
      canBlockActions: false,
      canSendNotifications: true,
      canCallAI: false,
      canAccessSecrets: true, // For notification service credentials
      maxRiskLevel: 'low',
      requiresApprovalFrom: [],
      canDelegateTo: []
    },
    description: 'Sends notifications only. No data access or modification capabilities.',
    constraints: [
      'Can only call notification APIs (email, SMS, webhook)',
      'Cannot access raw data - only pre-formatted messages',
      'Rate limited to prevent spam',
      'Message content must be pre-sanitized'
    ],
    auditRequirements: [
      'Log all notifications sent',
      'Track delivery status',
      'Record recipient counts (not identities)'
    ],
    escalationPath: ['orchestrator']
  },

  orchestrator: {
    role: 'orchestrator',
    permissions: {
      canReadData: true,
      canWriteData: false,
      canExecuteExternal: false,
      canModifyWorkflow: true, // Can adjust workflow routing
      canAccessPII: false,
      canApproveActions: true,
      canBlockActions: true,
      canSendNotifications: false,
      canCallAI: true,
      canAccessSecrets: false,
      maxRiskLevel: 'high',
      requiresApprovalFrom: ['guardian'],
      canDelegateTo: ['analyzer', 'executor', 'validator', 'notifier']
    },
    description: 'Coordinates workflow execution. Can delegate but not directly execute.',
    constraints: [
      'Cannot directly execute external actions',
      'Cannot access secrets or credentials',
      'Must delegate execution to appropriate roles',
      'Workflow modifications require guardian approval'
    ],
    auditRequirements: [
      'Log all delegation decisions',
      'Track workflow routing changes',
      'Record approval/denial decisions',
      'Maintain delegation chain'
    ],
    escalationPath: ['guardian']
  },

  validator: {
    role: 'validator',
    permissions: {
      canReadData: true,
      canWriteData: false,
      canExecuteExternal: false,
      canModifyWorkflow: false,
      canAccessPII: true, // For validation
      canApproveActions: true,
      canBlockActions: true,
      canSendNotifications: false,
      canCallAI: true, // For semantic validation
      canAccessSecrets: false,
      maxRiskLevel: 'medium',
      requiresApprovalFrom: [],
      canDelegateTo: []
    },
    description: 'Validates data and approves operations. No execution capabilities.',
    constraints: [
      'Cannot execute any actions',
      'Cannot modify data',
      'Must provide reasoning for approvals/denials',
      'Validation logic must be deterministic'
    ],
    auditRequirements: [
      'Log all validation results',
      'Record approval/denial reasoning',
      'Track validation duration',
      'Report validation failure patterns'
    ],
    escalationPath: ['guardian']
  },

  transformer: {
    role: 'transformer',
    permissions: {
      canReadData: true,
      canWriteData: true, // Only transformed outputs
      canExecuteExternal: false,
      canModifyWorkflow: false,
      canAccessPII: true,
      canApproveActions: false,
      canBlockActions: false,
      canSendNotifications: false,
      canCallAI: true,
      canAccessSecrets: false,
      maxRiskLevel: 'medium',
      requiresApprovalFrom: ['validator'],
      canDelegateTo: []
    },
    description: 'Transforms and processes data. No external execution capabilities.',
    constraints: [
      'Cannot call external APIs',
      'Cannot access credentials',
      'Output must be validated before use',
      'Must maintain data lineage'
    ],
    auditRequirements: [
      'Log input/output schemas',
      'Track transformation rules applied',
      'Record data volume processed',
      'Maintain transformation history'
    ],
    escalationPath: ['orchestrator', 'guardian']
  },

  guardian: {
    role: 'guardian',
    permissions: {
      canReadData: true,
      canWriteData: false,
      canExecuteExternal: false,
      canModifyWorkflow: true,
      canAccessPII: true,
      canApproveActions: true,
      canBlockActions: true,
      canSendNotifications: true,
      canCallAI: true,
      canAccessSecrets: false, // Even guardians can't access secrets directly
      maxRiskLevel: 'critical',
      requiresApprovalFrom: [], // Ultimate authority
      canDelegateTo: ['orchestrator', 'auditor']
    },
    description: 'Ultimate workflow authority. Can block any operation, modify workflows, and escalate.',
    constraints: [
      'Cannot directly execute external actions',
      'Cannot access secrets (security boundary)',
      'All decisions must be logged with reasoning',
      'Cannot be disabled during execution'
    ],
    auditRequirements: [
      'Log all approval/denial decisions with reasoning',
      'Track all workflow modifications',
      'Record escalation triggers',
      'Maintain immutable decision log'
    ],
    escalationPath: [] // No escalation - top of hierarchy
  }
};

export interface RoleViolation {
  nodeId: string;
  role: AgentRole;
  attemptedAction: string;
  permission: keyof RolePermissions;
  severity: 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
  blocked: boolean;
}

export interface RoleAssignment {
  nodeId: string;
  nodeType: string;
  assignedRole: AgentRole;
  justification: string;
  constraints: string[];
  requiresApproval: boolean;
  approvalChain: AgentRole[];
}

// Map node types to default roles
export function getDefaultRoleForNodeType(nodeType: string): AgentRole {
  const roleMap: Record<string, AgentRole> = {
    // Triggers have limited capability
    'trigger': 'analyzer',
    'webhook': 'analyzer',
    'schedule': 'analyzer',
    
    // AI nodes analyze
    'ai': 'analyzer',
    'ai_reasoner': 'analyzer',
    'ai_planner': 'analyzer',
    'ai_learner': 'analyzer',
    
    // Orchestrators coordinate
    'ai_orchestrator': 'orchestrator',
    
    // Executors do things
    'action': 'executor',
    'ai_executor': 'executor',
    'connector': 'executor',
    'ai_integrator': 'executor',
    
    // Data processing
    'data': 'transformer',
    'ai_transformer': 'transformer',
    
    // Validation
    'condition': 'validator',
    'ai_validator': 'validator',
    
    // Security and monitoring
    'guardrail': 'guardian',
    'security': 'guardian',
    'circuit_breaker': 'guardian',
    'error_handler': 'guardian',
    
    // Monitoring
    'ai_monitor': 'auditor',
    'checkpointer': 'auditor',
    
    // Communication
    'ai_communicator': 'notifier',
    
    // Storage - careful role
    'storage': 'transformer',
    
    // Handoffs need orchestration
    'agent_handoff': 'orchestrator',
    
    // Utilities
    'utility': 'transformer'
  };

  return roleMap[nodeType] || 'analyzer'; // Default to least-privilege
}

// Check if an action is permitted for a role
export function checkPermission(
  role: AgentRole,
  action: keyof RolePermissions
): { allowed: boolean; requiresApproval: boolean; approvers: AgentRole[] } {
  const contract = ROLE_CONTRACTS[role];
  const permission = contract.permissions[action];
  
  if (typeof permission === 'boolean') {
    return {
      allowed: permission,
      requiresApproval: contract.permissions.requiresApprovalFrom.length > 0,
      approvers: contract.permissions.requiresApprovalFrom
    };
  }
  
  return { allowed: false, requiresApproval: false, approvers: [] };
}

// Validate role assignments for a workflow
export function validateRoleAssignments(
  nodes: any[]
): { assignments: RoleAssignment[]; violations: RoleViolation[] } {
  const assignments: RoleAssignment[] = [];
  const violations: RoleViolation[] = [];
  const timestamp = new Date().toISOString();

  for (const node of nodes) {
    const defaultRole = getDefaultRoleForNodeType(node.type);
    const assignedRole: AgentRole = (node.config?.agentRole as AgentRole) || defaultRole;
    const contract = ROLE_CONTRACTS[assignedRole];

    // Check if node config requests capabilities beyond its role
    const nodeConfig = node.config || {};
    
    // Check for privilege creep
    if (nodeConfig.canWriteData && !contract.permissions.canWriteData) {
      violations.push({
        nodeId: node.id,
        role: assignedRole,
        attemptedAction: 'Write data',
        permission: 'canWriteData',
        severity: 'error',
        message: `Node "${node.title}" (${assignedRole}) cannot write data. Role contract violation.`,
        timestamp,
        blocked: true
      });
    }

    if (nodeConfig.canExecuteExternal && !contract.permissions.canExecuteExternal) {
      violations.push({
        nodeId: node.id,
        role: assignedRole,
        attemptedAction: 'Execute external API',
        permission: 'canExecuteExternal',
        severity: 'critical',
        message: `Node "${node.title}" (${assignedRole}) cannot execute external calls. Role contract violation.`,
        timestamp,
        blocked: true
      });
    }

    if (nodeConfig.canAccessSecrets && !contract.permissions.canAccessSecrets) {
      violations.push({
        nodeId: node.id,
        role: assignedRole,
        attemptedAction: 'Access secrets',
        permission: 'canAccessSecrets',
        severity: 'critical',
        message: `Node "${node.title}" (${assignedRole}) cannot access secrets. Role contract violation.`,
        timestamp,
        blocked: true
      });
    }

    assignments.push({
      nodeId: node.id,
      nodeType: node.type,
      assignedRole,
      justification: `Default role for ${node.type} nodes. ${contract.description}`,
      constraints: contract.constraints,
      requiresApproval: contract.permissions.requiresApprovalFrom.length > 0,
      approvalChain: contract.permissions.requiresApprovalFrom
    });
  }

  return { assignments, violations };
}

// Inject role contracts into workflow nodes
export function injectRoleContracts(nodes: any[]): {
  nodes: any[];
  assignments: RoleAssignment[];
  violations: RoleViolation[];
  hasViolations: boolean;
} {
  const { assignments, violations } = validateRoleAssignments(nodes);
  
  const enhancedNodes = nodes.map(node => {
    const assignment = assignments.find(a => a.nodeId === node.id);
    if (!assignment) return node;

    const contract = ROLE_CONTRACTS[assignment.assignedRole];
    
    return {
      ...node,
      config: {
        ...node.config,
        agentRole: assignment.assignedRole,
        roleContract: {
          permissions: contract.permissions,
          constraints: contract.constraints,
          auditRequirements: contract.auditRequirements,
          escalationPath: contract.escalationPath
        },
        roleEnforced: true,
        roleAssignedAt: new Date().toISOString()
      }
    };
  });

  return {
    nodes: enhancedNodes,
    assignments,
    violations,
    hasViolations: violations.length > 0
  };
}

// Generate role contract explanation for AI transparency
export function generateRoleContractExplanation(assignments: RoleAssignment[]): string {
  const lines = [
    '## Role Contract Enforcement',
    '',
    'This workflow has explicit role contracts to prevent privilege creep and ensure enterprise/government security compliance.',
    '',
    '### Agent Roles Assigned:',
    ''
  ];

  const roleCounts: Record<AgentRole, number> = {} as Record<AgentRole, number>;
  
  for (const assignment of assignments) {
    roleCounts[assignment.assignedRole] = (roleCounts[assignment.assignedRole] || 0) + 1;
  }

  for (const [role, count] of Object.entries(roleCounts)) {
    const contract = ROLE_CONTRACTS[role as AgentRole];
    lines.push(`- **${role}** (${count} nodes): ${contract.description}`);
  }

  lines.push('');
  lines.push('### Security Boundaries Enforced:');
  lines.push('');
  lines.push('- Analyzers cannot write data or execute external calls');
  lines.push('- Executors require validator/guardian approval for high-risk actions');
  lines.push('- Auditors maintain immutable logs of all operations');
  lines.push('- Guardians can block any operation but cannot access secrets');
  lines.push('- All role violations are blocked and logged');

  return lines.join('\n');
}

export const ROLE_CONTRACT_SYSTEM_PROMPT = `
EXPLICIT ROLE CONTRACTS (ENTERPRISE/GOVERNMENT SECURITY):

Every workflow node MUST have an assigned role that enforces strict permission boundaries:

1. ANALYZER - Read-only + AI
   - CAN: Read data, call AI, analyze
   - CANNOT: Write, execute external, access secrets
   - USE FOR: Data analysis, AI insights, content generation

2. EXECUTOR - Action performer (requires approval)
   - CAN: Execute actions, write data, call APIs
   - REQUIRES: Validator approval for high-risk, Guardian for critical
   - USE FOR: API calls, database writes, integrations

3. AUDITOR - Compliance monitor
   - CAN: Read all, log all, alert on violations
   - CANNOT: Modify anything except audit logs
   - USE FOR: Compliance, security monitoring, audit trails

4. NOTIFIER - Communication only
   - CAN: Send notifications (email, SMS, webhook)
   - CANNOT: Access raw data, execute other actions
   - USE FOR: Alerts, notifications, communication

5. ORCHESTRATOR - Coordinator
   - CAN: Route workflows, delegate tasks, approve
   - CANNOT: Directly execute actions
   - USE FOR: Workflow management, coordination

6. VALIDATOR - Approval authority
   - CAN: Read, validate, approve/deny
   - CANNOT: Execute or modify
   - USE FOR: Data validation, action approval

7. TRANSFORMER - Data processing
   - CAN: Read, transform, write processed output
   - CANNOT: Call external APIs
   - USE FOR: ETL, data conversion, formatting

8. GUARDIAN - Ultimate authority
   - CAN: Block any action, modify workflow
   - CANNOT: Access secrets, execute directly
   - USE FOR: Security gates, escalation, final approval

PRIVILEGE CREEP PREVENTION:
- Nodes cannot exceed their role permissions
- Violations are blocked and logged
- All role assignments must be justified
- Escalation paths are enforced
`;
