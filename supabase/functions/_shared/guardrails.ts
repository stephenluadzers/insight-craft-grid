export interface WorkflowNode {
  id: string;
  type: string;
  title: string;
  description?: string;
  x: number;
  y: number;
  config?: Record<string, any>;
}

export function injectGuardrailNodes(nodes: WorkflowNode[]): WorkflowNode[] {
  if (!nodes || nodes.length === 0) return nodes;

  const guardrails: WorkflowNode[] = [];
  const modifiedNodes = [...nodes];
  let guardrailY = 0;

  // Find all action nodes for rate limiting
  const actionNodes = nodes.filter(n => n.type === 'action' || n.type === 'connector');
  
  // Find all AI nodes for content safety
  const aiNodes = nodes.filter(n => n.type === 'ai');
  
  // Find data nodes for validation
  const dataNodes = nodes.filter(n => n.type === 'data');
  
  // Find the max Y position for positioning
  const maxY = Math.max(...nodes.map(n => n.y), 0);
  guardrailY = maxY + 200;

  // 1. Add input validation guardrail at the start (after trigger)
  const triggerNodes = nodes.filter(n => n.type === 'trigger');
  if (triggerNodes.length > 0) {
    guardrails.push({
      id: `guardrail_input_${Date.now()}`,
      type: 'guardrail',
      title: 'Input Validation',
      description: 'Validates incoming data structure and types',
      x: triggerNodes[0].x + 300,
      y: triggerNodes[0].y,
      config: {
        guardrailType: 'input_validation',
        rules: {
          data: {
            required: true,
            type: 'object'
          }
        }
      }
    });
  }

  // 2. Add rate limiting for external API calls
  if (actionNodes.length > 0) {
    guardrails.push({
      id: `guardrail_rate_limit_${Date.now()}`,
      type: 'guardrail',
      title: 'API Rate Limiter',
      description: 'Prevents API overload with rate limiting',
      x: 100,
      y: guardrailY,
      config: {
        guardrailType: 'rate_limit',
        limit: 100,
        window: 60
      }
    });
    guardrailY += 200;
  }

  // 3. Add security checks for AI content
  if (aiNodes.length > 0) {
    guardrails.push({
      id: `guardrail_security_${Date.now()}`,
      type: 'guardrail',
      title: 'Security Scanner',
      description: 'Scans for SQL injection, XSS, and malicious content',
      x: 100,
      y: guardrailY,
      config: {
        guardrailType: 'security_check',
        checks: ['no_sql_injection', 'no_xss', 'sanitize_input']
      }
    });
    guardrailY += 200;
  }

  // 4. Add output validation before final actions
  const finalActionNodes = nodes.filter(n => 
    (n.type === 'action' || n.type === 'connector') && 
    !nodes.some(other => other.config?.dependencies?.includes(n.id))
  );
  
  if (finalActionNodes.length > 0) {
    guardrails.push({
      id: `guardrail_output_${Date.now()}`,
      type: 'guardrail',
      title: 'Output Validation',
      description: 'Ensures output meets expected schema',
      x: 100,
      y: guardrailY,
      config: {
        guardrailType: 'output_validation',
        schema: {
          status: 'string',
          data: 'object'
        }
      }
    });
    guardrailY += 200;
  }

  // 5. Add compliance check if handling sensitive data
  const hasSensitiveData = nodes.some(n => 
    n.title?.toLowerCase().includes('email') ||
    n.title?.toLowerCase().includes('user') ||
    n.title?.toLowerCase().includes('payment') ||
    n.title?.toLowerCase().includes('personal')
  );

  if (hasSensitiveData) {
    guardrails.push({
      id: `guardrail_compliance_${Date.now()}`,
      type: 'guardrail',
      title: 'Compliance Check',
      description: 'Ensures GDPR and data protection compliance',
      x: 100,
      y: guardrailY,
      config: {
        guardrailType: 'compliance_check',
        standards: ['gdpr']
      }
    });
  }

  return [...modifiedNodes, ...guardrails];
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
`;
