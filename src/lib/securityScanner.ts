import { WorkflowNodeData } from "@/components/WorkflowNode";

export interface SecurityIssue {
  rule_name: string;
  rule_type: string;
  risk_level: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  description: string;
  remediation: string;
  location: string;
  matched_pattern?: string;
}

export interface SecurityScanResult {
  risk_level: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  issues: SecurityIssue[];
  passed: boolean;
}

// Security rules for scanning workflows
const SECURITY_RULES = [
  {
    name: 'sql-injection-attempt',
    type: 'code_pattern',
    pattern: /(DROP|DELETE|TRUNCATE|ALTER)\s+(TABLE|DATABASE)/i,
    risk: 'critical' as const,
    description: 'Potential SQL injection attempt detected',
    remediation: 'Review workflow for SQL injection vulnerabilities',
  },
  {
    name: 'command-injection',
    type: 'code_pattern',
    pattern: /(eval|exec|system|subprocess|shell)/i,
    risk: 'critical' as const,
    description: 'Command execution attempt detected',
    remediation: 'Remove command execution code from workflow',
  },
  {
    name: 'sensitive-data-exposure',
    type: 'data_pattern',
    pattern: /(password|secret|api[_-]?key|token|private[_-]?key)\s*[:=]/i,
    risk: 'high' as const,
    description: 'Potential hardcoded credentials detected',
    remediation: 'Remove hardcoded credentials, use secure credential storage',
  },
  {
    name: 'external-url-access',
    type: 'network_pattern',
    pattern: /https?:\/\/(?!api\.|localhost|127\.0\.0\.1)/i,
    risk: 'medium' as const,
    description: 'External URL access detected',
    remediation: 'Review external API calls and add to allowlist',
  },
  {
    name: 'file-system-access',
    type: 'code_pattern',
    pattern: /(fs\.|file\.|readFile|writeFile|unlink)/i,
    risk: 'high' as const,
    description: 'File system access detected',
    remediation: 'Remove file system operations',
  },
  {
    name: 'excessive-loops',
    type: 'code_pattern',
    pattern: /while\s*\(\s*true\s*\)/i,
    risk: 'high' as const,
    description: 'Infinite loop detected',
    remediation: 'Add proper loop termination conditions',
  },
  {
    name: 'crypto-mining',
    type: 'code_pattern',
    pattern: /(mining|miner|hashrate|cryptonight)/i,
    risk: 'critical' as const,
    description: 'Potential crypto mining code',
    remediation: 'Remove cryptocurrency mining code',
  },
  {
    name: 'data-exfiltration',
    type: 'code_pattern',
    pattern: /(btoa|atob|Buffer\.from.*base64)/i,
    risk: 'medium' as const,
    description: 'Potential data encoding/exfiltration',
    remediation: 'Review data encoding operations',
  },
  {
    name: 'ddos-pattern',
    type: 'network_pattern',
    pattern: /for.*fetch|while.*fetch/i,
    risk: 'high' as const,
    description: 'Potential DDoS pattern detected',
    remediation: 'Implement rate limiting and remove excessive requests',
  },
  {
    name: 'prototype-pollution',
    type: 'code_pattern',
    pattern: /__proto__|constructor\[.*\]/i,
    risk: 'high' as const,
    description: 'Prototype pollution attempt',
    remediation: 'Remove prototype manipulation code',
  },
  {
    name: 'xss-attempt',
    type: 'code_pattern',
    pattern: /(innerHTML|outerHTML|document\.write|dangerouslySetInnerHTML)/i,
    risk: 'high' as const,
    description: 'Potential XSS vulnerability',
    remediation: 'Use safe DOM manipulation methods',
  },
  {
    name: 'excessive-network-calls',
    type: 'logic_pattern',
    pattern: null,
    risk: 'medium' as const,
    description: 'Too many network nodes in workflow',
    remediation: 'Reduce number of API calls to prevent abuse',
  },
];

/**
 * Scans a workflow for security vulnerabilities
 */
export const scanWorkflowSecurity = (nodes: WorkflowNodeData[]): SecurityScanResult => {
  const issues: SecurityIssue[] = [];

  // Scan each node
  for (const node of nodes) {
    const nodeContent = JSON.stringify({
      title: node.title,
      config: node.config,
      type: node.type,
    });

    // Check against each security rule
    for (const rule of SECURITY_RULES) {
      if (rule.pattern && rule.pattern.test(nodeContent)) {
        issues.push({
          rule_name: rule.name,
          rule_type: rule.type,
          risk_level: rule.risk,
          description: rule.description,
          remediation: rule.remediation,
          location: `Node: ${node.title} (${node.type})`,
          matched_pattern: rule.pattern.source,
        });
      }
    }
  }

  // Check for excessive network calls
  const networkNodes = nodes.filter(n => 
    n.type === 'action' && 
    (n.config?.action_type === 'api_call' || n.title.toLowerCase().includes('api'))
  );
  
  if (networkNodes.length > 10) {
    issues.push({
      rule_name: 'excessive-network-calls',
      rule_type: 'logic_pattern',
      risk_level: 'medium',
      description: `${networkNodes.length} network nodes detected (max recommended: 10)`,
      remediation: 'Reduce number of API calls to prevent abuse',
      location: 'Workflow structure',
    });
  }

  // Check for excessive complexity
  if (nodes.length > 50) {
    issues.push({
      rule_name: 'excessive-complexity',
      rule_type: 'logic_pattern',
      risk_level: 'low',
      description: `Workflow has ${nodes.length} nodes (max recommended: 50)`,
      remediation: 'Consider breaking into smaller workflows',
      location: 'Workflow structure',
    });
  }

  // Determine overall risk level
  const riskLevels = issues.map(i => i.risk_level);
  let overallRisk: 'safe' | 'low' | 'medium' | 'high' | 'critical' = 'safe';

  if (riskLevels.includes('critical')) {
    overallRisk = 'critical';
  } else if (riskLevels.includes('high')) {
    overallRisk = 'high';
  } else if (riskLevels.includes('medium')) {
    overallRisk = 'medium';
  } else if (riskLevels.includes('low')) {
    overallRisk = 'low';
  }

  return {
    risk_level: overallRisk,
    issues,
    passed: overallRisk !== 'critical' && overallRisk !== 'high',
  };
};

/**
 * Validates if a workflow meets security requirements before execution
 */
export const validateWorkflowSecurity = (
  nodes: WorkflowNodeData[],
  requireApproval: boolean = false
): { valid: boolean; reason?: string; scanResult?: SecurityScanResult } => {
  const scanResult = scanWorkflowSecurity(nodes);

  // Critical risks are always blocked
  if (scanResult.risk_level === 'critical') {
    return {
      valid: false,
      reason: 'Workflow contains critical security risks and cannot be executed',
      scanResult,
    };
  }

  // High risks require approval
  if (scanResult.risk_level === 'high' && requireApproval) {
    return {
      valid: false,
      reason: 'Workflow contains high security risks and requires admin approval',
      scanResult,
    };
  }

  return {
    valid: true,
    scanResult,
  };
};
