import { detectComplianceRequirements, selectGuardrailsForCompliance, calculateWorkflowRiskScore, GuardrailExplanation } from './guardrail-registry.ts';
import { injectRoleContracts, generateRoleContractExplanation, type RoleAssignment, type RoleViolation } from './role-contracts.ts';

export interface WorkflowNode {
  id: string;
  type: string;
  title: string;
  description?: string;
  x: number;
  y: number;
  config?: Record<string, any>;
}

export interface GuardrailInjectionResult {
  nodes: WorkflowNode[];
  explanations: GuardrailExplanation[];
  complianceStandards: string[];
  guardrailsAdded: number;
  riskScore: number;
  roleAssignments?: RoleAssignment[];
  roleViolations?: RoleViolation[];
  roleContractExplanation?: string;
}

export function injectGuardrailNodes(nodes: WorkflowNode[]): GuardrailInjectionResult {
  if (!nodes || nodes.length === 0) {
    return {
      nodes,
      explanations: [],
      complianceStandards: [],
      guardrailsAdded: 0,
      riskScore: 10
    };
  }

  const guardrails: WorkflowNode[] = [];
  const explanations: GuardrailExplanation[] = [];
  const modifiedNodes = [...nodes];
  let guardrailY = 0;

  // Step 1: Detect compliance requirements
  const requiredStandards = detectComplianceRequirements(nodes);
  console.log('Detected compliance standards:', requiredStandards);

  // Step 2: Select guardrails based on compliance and context
  const selectedGuardrails = selectGuardrailsForCompliance(requiredStandards, nodes);
  console.log('Selected guardrails:', selectedGuardrails.length);

  // Find all action nodes for rate limiting
  const actionNodes = nodes.filter(n => n.type === 'action' || n.type === 'connector');
  
  // Find all AI nodes for content safety
  const aiNodes = nodes.filter(n => n.type === 'ai');
  
  // Find data nodes for validation
  const dataNodes = nodes.filter(n => n.type === 'data');
  
  // Find the max Y position for positioning
  const maxY = Math.max(...nodes.map(n => n.y), 0);
  guardrailY = maxY + 200;

  const triggerNodes = nodes.filter(n => n.type === 'trigger');
  const timestamp = new Date().toISOString();

  // Step 3: Create guardrail nodes from registry with explanations
  for (const { guardrail, explanation } of selectedGuardrails) {
    const nodeId = `${guardrail.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Determine position based on context
    let x = 100;
    let y = guardrailY;
    
    if (guardrail.context.includes('user_input') && triggerNodes.length > 0) {
      x = triggerNodes[0].x + 300;
      y = triggerNodes[0].y;
    } else {
      guardrailY += 200;
    }

    guardrails.push({
      id: nodeId,
      type: 'guardrail',
      title: guardrail.name,
      description: guardrail.description,
      x,
      y,
      config: {
        ...guardrail.config,
        registryId: guardrail.id,
        severity: guardrail.severity,
        complianceStandards: guardrail.complianceStandards,
        explanation: explanation
      }
    });

    explanations.push({
      guardrailId: guardrail.id,
      ruleName: guardrail.name,
      reason: explanation,
      triggeredBy: guardrail.context,
      complianceStandards: guardrail.complianceStandards,
      severity: guardrail.severity,
      nodeId,
      timestamp
    });
  }

  console.log('Injected', guardrails.length, 'guardrails with explanations');

  // Calculate risk score
  const appliedGuardrails = selectedGuardrails.map(sg => sg.guardrail);
  const riskScore = calculateWorkflowRiskScore(appliedGuardrails, requiredStandards);

  // Inject role contracts for all nodes (including guardrails)
  const allNodes = [...modifiedNodes, ...guardrails];
  const roleResult = injectRoleContracts(allNodes);
  const roleExplanation = generateRoleContractExplanation(roleResult.assignments);

  console.log('Assigned roles to', roleResult.assignments.length, 'nodes');
  if (roleResult.violations.length > 0) {
    console.warn('Role violations detected:', roleResult.violations.length);
  }

  return {
    nodes: roleResult.nodes,
    explanations,
    complianceStandards: requiredStandards,
    guardrailsAdded: guardrails.length,
    riskScore,
    roleAssignments: roleResult.assignments,
    roleViolations: roleResult.violations,
    roleContractExplanation: roleExplanation
  };
}

export const GUARDRAIL_SYSTEM_PROMPT = `
GUARDRAIL NODES (CRITICAL SECURITY LAYER):
You MUST include guardrail nodes to protect workflows from failures, attacks, and data issues.

Guardrail Types:
1. rate_limit - Prevent API overload
   Example config: {"guardrailType": "rate_limit", "limit": 100, "window": 60}

2. input_validation - Validate incoming data
   Example config: {"guardrailType": "input_validation", "rules": {"email": {"required": true, "type": "string", "pattern": "^[^@]+@[^@]+$"}}}

3. output_validation - Ensure output meets schema
   Example config: {"guardrailType": "output_validation", "schema": {"status": "string", "data": "object"}}

4. security_check - Scan for SQL injection, XSS, malicious content
   Example config: {"guardrailType": "security_check", "checks": ["no_sql_injection", "no_xss", "sanitize_input"]}

5. compliance_check - GDPR, PCI-DSS, HIPAA compliance
   Example config: {"guardrailType": "compliance_check", "standards": ["gdpr", "pci_dss"]}

PLACEMENT RULES:
- Input validation: After trigger nodes
- Rate limiting: Before external API calls
- Security checks: Before AI/data processing
- Output validation: Before final actions
- Compliance: When handling personal/payment data

ALWAYS include at least 2-3 guardrail nodes in every workflow for production readiness.

ROLE CONTRACT ENFORCEMENT:
All workflow nodes are automatically assigned roles (Analyzer, Executor, Auditor, Notifier, Orchestrator, Validator, Transformer, Guardian) with strict permission boundaries to prevent privilege creep and ensure enterprise/government security compliance.
`;

export { injectRoleContracts, generateRoleContractExplanation } from './role-contracts.ts';
export type { RoleAssignment, RoleViolation } from './role-contracts.ts';
