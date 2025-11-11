export interface GuardrailRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  context: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  complianceStandards: string[];
  description: string;
  config: Record<string, any>;
}

export const GUARDRAIL_REGISTRY: Record<string, GuardrailRule> = {
  'guardrail_sql_injection': {
    id: 'guardrail_sql_injection',
    name: 'SQL Injection Protection',
    trigger: 'User input includes SQL patterns or database operations detected',
    action: 'Sanitize input and block SQL keywords',
    context: ['database', 'query', 'user_input'],
    severity: 'critical',
    complianceStandards: ['OWASP', 'PCI-DSS', 'SOC2'],
    description: 'Prevents SQL injection attacks by scanning for malicious SQL patterns',
    config: {
      guardrailType: 'security_check',
      checks: ['no_sql_injection']
    }
  },

  'guardrail_xss_protection': {
    id: 'guardrail_xss_protection',
    name: 'XSS Attack Prevention',
    trigger: 'HTML/JavaScript patterns detected in user input',
    action: 'Sanitize HTML and remove script tags',
    context: ['web', 'user_input', 'frontend'],
    severity: 'critical',
    complianceStandards: ['OWASP', 'SOC2'],
    description: 'Prevents cross-site scripting attacks by sanitizing HTML content',
    config: {
      guardrailType: 'security_check',
      checks: ['no_xss', 'sanitize_input']
    }
  },

  'guardrail_rate_limiting': {
    id: 'guardrail_rate_limiting',
    name: 'API Rate Limiter',
    trigger: 'External API calls or high-volume operations detected',
    action: 'Limit requests per time window',
    context: ['api', 'external_service', 'performance'],
    severity: 'high',
    complianceStandards: ['SOC2'],
    description: 'Prevents API overload and ensures fair usage',
    config: {
      guardrailType: 'rate_limit',
      limit: 100,
      window: 60
    }
  },

  'guardrail_gdpr_compliance': {
    id: 'guardrail_gdpr_compliance',
    name: 'GDPR Data Protection',
    trigger: 'Personal data processing detected (email, name, address)',
    action: 'Verify consent and enable data deletion rights',
    context: ['personal_data', 'privacy', 'eu'],
    severity: 'critical',
    complianceStandards: ['GDPR'],
    description: 'Ensures GDPR compliance for personal data processing',
    config: {
      guardrailType: 'compliance_check',
      standards: ['gdpr']
    }
  },

  'guardrail_hipaa_compliance': {
    id: 'guardrail_hipaa_compliance',
    name: 'HIPAA Healthcare Data Protection',
    trigger: 'Healthcare or medical data detected (diagnosis, treatment, health records)',
    action: 'Encrypt data and ensure audit logging',
    context: ['healthcare', 'phi', 'medical'],
    severity: 'critical',
    complianceStandards: ['HIPAA'],
    description: 'Protects Protected Health Information (PHI) per HIPAA requirements',
    config: {
      guardrailType: 'compliance_check',
      standards: ['hipaa']
    }
  },

  'guardrail_pci_dss': {
    id: 'guardrail_pci_dss',
    name: 'PCI-DSS Payment Protection',
    trigger: 'Payment or credit card data detected',
    action: 'Mask sensitive data and ensure secure transmission',
    context: ['payment', 'credit_card', 'financial'],
    severity: 'critical',
    complianceStandards: ['PCI-DSS'],
    description: 'Ensures PCI-DSS compliance for payment data handling',
    config: {
      guardrailType: 'compliance_check',
      standards: ['pci_dss']
    }
  },

  'guardrail_input_validation': {
    id: 'guardrail_input_validation',
    name: 'Input Data Validator',
    trigger: 'User input or external data entry point detected',
    action: 'Validate data types, formats, and required fields',
    context: ['user_input', 'data_entry', 'validation'],
    severity: 'high',
    complianceStandards: ['OWASP', 'SOC2'],
    description: 'Validates input data structure and prevents malformed data',
    config: {
      guardrailType: 'input_validation',
      rules: {
        data: { required: true, type: 'object' }
      }
    }
  },

  'guardrail_output_validation': {
    id: 'guardrail_output_validation',
    name: 'Output Schema Validator',
    trigger: 'Final output or API response detected',
    action: 'Ensure output matches expected schema',
    context: ['output', 'api_response', 'data_integrity'],
    severity: 'medium',
    complianceStandards: ['SOC2'],
    description: 'Validates output data structure before sending to consumers',
    config: {
      guardrailType: 'output_validation',
      schema: { status: 'string', data: 'object' }
    }
  },

  'guardrail_data_masking': {
    id: 'guardrail_data_masking',
    name: 'Sensitive Data Masking',
    trigger: 'PII or sensitive data in logs or outputs',
    action: 'Mask or redact sensitive information',
    context: ['logging', 'privacy', 'sensitive_data'],
    severity: 'high',
    complianceStandards: ['GDPR', 'HIPAA', 'PCI-DSS'],
    description: 'Prevents exposure of sensitive data in logs and outputs',
    config: {
      guardrailType: 'security_check',
      checks: ['sanitize_input']
    }
  },

  'guardrail_audit_logging': {
    id: 'guardrail_audit_logging',
    name: 'Audit Trail Logger',
    trigger: 'High-risk operations or compliance-required actions',
    action: 'Log all actions with timestamps and user context',
    context: ['audit', 'compliance', 'security'],
    severity: 'high',
    complianceStandards: ['SOC2', 'HIPAA', 'PCI-DSS'],
    description: 'Maintains audit trail for compliance and security investigations',
    config: {
      guardrailType: 'security_check',
      checks: ['audit_log']
    }
  }
};

export interface GuardrailExplanation {
  guardrailId: string;
  ruleName: string;
  reason: string;
  triggeredBy: string[];
  complianceStandards: string[];
  severity: string;
  nodeId: string;
  timestamp: string;
}

export function detectComplianceRequirements(nodes: any[]): string[] {
  const standards = new Set<string>();
  
  for (const node of nodes) {
    const title = node.title?.toLowerCase() || '';
    const description = node.description?.toLowerCase() || '';
    const content = `${title} ${description}`;

    // GDPR detection
    if (content.match(/\b(email|name|address|personal|user data|privacy|consent|eu|european)\b/)) {
      standards.add('GDPR');
    }

    // HIPAA detection
    if (content.match(/\b(health|medical|patient|diagnosis|treatment|healthcare|phi|hospital|clinic)\b/)) {
      standards.add('HIPAA');
    }

    // PCI-DSS detection
    if (content.match(/\b(payment|credit card|card|transaction|billing|stripe|paypal|financial)\b/)) {
      standards.add('PCI-DSS');
    }

    // SOC2 detection (general security/data handling)
    if (content.match(/\b(api|database|storage|security|authentication|authorization)\b/)) {
      standards.add('SOC2');
    }
  }

  return Array.from(standards);
}

export function selectGuardrailsForCompliance(
  standards: string[],
  nodes: any[]
): { guardrail: GuardrailRule; explanation: string }[] {
  const selectedGuardrails: { guardrail: GuardrailRule; explanation: string }[] = [];
  const content = nodes.map(n => `${n.title} ${n.description || ''}`).join(' ').toLowerCase();

  for (const [id, rule] of Object.entries(GUARDRAIL_REGISTRY)) {
    // Check if rule applies to any required standard
    const appliesToStandard = rule.complianceStandards.some(std => standards.includes(std));
    
    if (!appliesToStandard) continue;

    // Check if trigger conditions are met
    let triggered = false;
    let triggerDetails: string[] = [];

    for (const ctx of rule.context) {
      if (content.includes(ctx)) {
        triggered = true;
        triggerDetails.push(ctx);
      }
    }

    if (triggered) {
      selectedGuardrails.push({
        guardrail: rule,
        explanation: `Added ${rule.name} because: ${rule.trigger}. Detected context: ${triggerDetails.join(', ')}. Required by: ${rule.complianceStandards.filter(s => standards.includes(s)).join(', ')}.`
      });
    }
  }

  return selectedGuardrails;
}
