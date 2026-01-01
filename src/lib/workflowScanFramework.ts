import { WorkflowNodeData } from "@/types/workflow";

export interface ScanFinding {
  id: string;
  category: 'performance' | 'cost' | 'reliability' | 'security' | 'scalability';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  impact: {
    costImpact: number; // cents per execution
    timeImpact: number; // ms saved/lost
    reliabilityImpact: number; // percentage change
  };
  recommendation: string;
  affectedNodes: string[];
  autoFixable: boolean;
  fix?: () => WorkflowNodeData[];
}

export interface ScanResult {
  scanId: string;
  timestamp: string;
  workflowName: string;
  overallScore: number; // 0-100
  categoryScores: {
    performance: number;
    cost: number;
    reliability: number;
    security: number;
    scalability: number;
  };
  findings: ScanFinding[];
  optimizationPotential: {
    costSavingsPerYear: number;
    timeReductionPercent: number;
    reliabilityImprovement: number;
  };
  scanDuration: number;
}

// Scan rules configuration
const SCAN_RULES = {
  performance: [
    {
      id: 'PERF-001',
      name: 'Sequential AI Calls',
      check: (nodes: WorkflowNodeData[]) => {
        const aiNodes = nodes.filter(n => n.type === 'ai');
        const sequential = aiNodes.filter((node, i) => {
          if (i === 0) return false;
          const prevNode = nodes[nodes.indexOf(node) - 1];
          return prevNode?.type === 'ai';
        });
        return sequential.length > 0 ? sequential : null;
      },
      severity: 'high' as const,
      title: 'Sequential AI Calls Detected',
      description: 'Multiple AI nodes running in sequence can slow execution. Consider parallelizing.',
      costImpact: 50,
      timeImpact: 2000,
      reliabilityImpact: -5,
      recommendation: 'Restructure workflow to run independent AI calls in parallel using a fan-out pattern.',
      autoFixable: false,
    },
    {
      id: 'PERF-002',
      name: 'Missing Caching',
      check: (nodes: WorkflowNodeData[]) => {
        const aiNodes = nodes.filter(n => n.type === 'ai');
        const uncached = aiNodes.filter(n => !n.config?.cacheEnabled);
        return uncached.length > 0 ? uncached : null;
      },
      severity: 'medium' as const,
      title: 'AI Results Not Cached',
      description: 'Repeated identical AI calls waste API credits and slow execution.',
      costImpact: 25,
      timeImpact: 1000,
      reliabilityImpact: 0,
      recommendation: 'Enable caching for AI nodes processing repeated or predictable inputs.',
      autoFixable: true,
    },
    {
      id: 'PERF-003',
      name: 'Large Payload Transfers',
      check: (nodes: WorkflowNodeData[]) => {
        const dataNodes = nodes.filter(n => n.type === 'data');
        const noTruncation = dataNodes.filter(n => !n.config?.truncateOutput);
        return noTruncation.length > 0 ? noTruncation : null;
      },
      severity: 'low' as const,
      title: 'Unoptimized Data Transfers',
      description: 'Large payloads between nodes increase latency and memory usage.',
      costImpact: 5,
      timeImpact: 500,
      reliabilityImpact: -2,
      recommendation: 'Add payload truncation or selective field extraction for data nodes.',
      autoFixable: true,
    },
  ],
  cost: [
    {
      id: 'COST-001',
      name: 'Expensive Model Usage',
      check: (nodes: WorkflowNodeData[]) => {
        const aiNodes = nodes.filter(n => n.type === 'ai');
        const expensiveModels = aiNodes.filter(n => 
          n.config?.model?.includes('gpt-4') || 
          n.config?.model?.includes('claude-3-opus')
        );
        return expensiveModels.length > 0 ? expensiveModels : null;
      },
      severity: 'medium' as const,
      title: 'Premium AI Models in Use',
      description: 'Premium models like GPT-4 or Claude Opus are 10-30x more expensive than alternatives.',
      costImpact: 150,
      timeImpact: 0,
      reliabilityImpact: 0,
      recommendation: 'Evaluate if cheaper models (GPT-3.5-turbo, Claude Haiku) can achieve similar results.',
      autoFixable: false,
    },
    {
      id: 'COST-002',
      name: 'Redundant API Calls',
      check: (nodes: WorkflowNodeData[]) => {
        const actionNodes = nodes.filter(n => n.type === 'action');
        const endpoints: Record<string, typeof actionNodes> = {};
        actionNodes.forEach(n => {
          const endpoint = n.config?.endpoint || n.title;
          if (!endpoints[endpoint]) endpoints[endpoint] = [];
          endpoints[endpoint].push(n);
        });
        const duplicates = Object.values(endpoints).filter(arr => arr.length > 1);
        return duplicates.length > 0 ? duplicates.flat() : null;
      },
      severity: 'high' as const,
      title: 'Duplicate API Endpoints',
      description: 'Multiple nodes calling the same endpoint may indicate redundant operations.',
      costImpact: 30,
      timeImpact: 800,
      reliabilityImpact: -3,
      recommendation: 'Consolidate duplicate API calls and cache/reuse results.',
      autoFixable: false,
    },
    {
      id: 'COST-003',
      name: 'No Rate Limiting',
      check: (nodes: WorkflowNodeData[]) => {
        const actionNodes = nodes.filter(n => n.type === 'action' || n.type === 'ai');
        const noRateLimit = actionNodes.filter(n => !n.config?.rateLimit);
        return noRateLimit.length > 1 ? noRateLimit : null;
      },
      severity: 'medium' as const,
      title: 'Missing Rate Limiting',
      description: 'Uncontrolled API calls can lead to unexpected costs and rate limit errors.',
      costImpact: 100,
      timeImpact: 0,
      reliabilityImpact: -15,
      recommendation: 'Add rate limiting configuration to prevent runaway costs.',
      autoFixable: true,
    },
  ],
  reliability: [
    {
      id: 'REL-001',
      name: 'No Error Handling',
      check: (nodes: WorkflowNodeData[]) => {
        const noErrorHandling = nodes.filter(n => !n.config?.errorHandler);
        return noErrorHandling.length > nodes.length * 0.5 ? noErrorHandling : null;
      },
      severity: 'critical' as const,
      title: 'Missing Error Handlers',
      description: 'Nodes without error handling will crash the entire workflow on failure.',
      costImpact: 0,
      timeImpact: 0,
      reliabilityImpact: -40,
      recommendation: 'Add try-catch blocks or error handler nodes for critical operations.',
      autoFixable: true,
    },
    {
      id: 'REL-002',
      name: 'No Retry Logic',
      check: (nodes: WorkflowNodeData[]) => {
        const externalNodes = nodes.filter(n => n.type === 'action' || n.type === 'ai');
        const noRetry = externalNodes.filter(n => !n.config?.retryEnabled);
        return noRetry.length > 0 ? noRetry : null;
      },
      severity: 'high' as const,
      title: 'Missing Retry Configuration',
      description: 'External API calls can fail transiently. Without retries, temporary issues become failures.',
      costImpact: 0,
      timeImpact: 0,
      reliabilityImpact: -25,
      recommendation: 'Enable automatic retries with exponential backoff for external calls.',
      autoFixable: true,
    },
    {
      id: 'REL-003',
      name: 'No Timeout Configuration',
      check: (nodes: WorkflowNodeData[]) => {
        const externalNodes = nodes.filter(n => n.type === 'action' || n.type === 'ai');
        const noTimeout = externalNodes.filter(n => !n.config?.timeout);
        return noTimeout.length > 0 ? noTimeout : null;
      },
      severity: 'medium' as const,
      title: 'Missing Timeout Settings',
      description: 'Without timeouts, hung API calls can block the workflow indefinitely.',
      costImpact: 10,
      timeImpact: 30000,
      reliabilityImpact: -10,
      recommendation: 'Set appropriate timeout values for all external operations.',
      autoFixable: true,
    },
  ],
  security: [
    {
      id: 'SEC-001',
      name: 'Hardcoded Credentials',
      check: (nodes: WorkflowNodeData[]) => {
        const suspicious = nodes.filter(n => {
          const configStr = JSON.stringify(n.config || {});
          return /api[_-]?key|secret|password|token/i.test(configStr) &&
                 !/\{\{.*\}\}/.test(configStr); // Not using variables
        });
        return suspicious.length > 0 ? suspicious : null;
      },
      severity: 'critical' as const,
      title: 'Potential Hardcoded Credentials',
      description: 'API keys or secrets appear to be hardcoded instead of using secure variables.',
      costImpact: 0,
      timeImpact: 0,
      reliabilityImpact: 0,
      recommendation: 'Move all credentials to secure environment variables or a secrets manager.',
      autoFixable: false,
    },
    {
      id: 'SEC-002',
      name: 'No Input Validation',
      check: (nodes: WorkflowNodeData[]) => {
        const triggers = nodes.filter(n => n.type === 'trigger');
        const noValidation = triggers.filter(n => !n.config?.inputValidation);
        return noValidation.length > 0 ? noValidation : null;
      },
      severity: 'high' as const,
      title: 'Missing Input Validation',
      description: 'Triggers accepting external input without validation are vulnerable to injection attacks.',
      costImpact: 0,
      timeImpact: 0,
      reliabilityImpact: -20,
      recommendation: 'Add input validation schemas to all trigger nodes.',
      autoFixable: true,
    },
    {
      id: 'SEC-003',
      name: 'Sensitive Data Logging',
      check: (nodes: WorkflowNodeData[]) => {
        const loggingNodes = nodes.filter(n => n.config?.logOutput === true);
        return loggingNodes.length > 0 ? loggingNodes : null;
      },
      severity: 'medium' as const,
      title: 'Verbose Logging Enabled',
      description: 'Full output logging may expose sensitive data in logs.',
      costImpact: 0,
      timeImpact: 0,
      reliabilityImpact: 0,
      recommendation: 'Disable verbose logging or implement log scrubbing for sensitive fields.',
      autoFixable: true,
    },
  ],
  scalability: [
    {
      id: 'SCALE-001',
      name: 'No Parallelization',
      check: (nodes: WorkflowNodeData[]) => {
        // Check if workflow is purely linear with no parallel branches
        const hasConditions = nodes.some(n => n.type === 'condition');
        if (!hasConditions && nodes.length > 5) {
          return nodes;
        }
        return null;
      },
      severity: 'medium' as const,
      title: 'Linear Workflow Structure',
      description: 'Purely linear workflows cannot scale for batch processing.',
      costImpact: 0,
      timeImpact: 5000,
      reliabilityImpact: 0,
      recommendation: 'Consider adding parallel processing paths for independent operations.',
      autoFixable: false,
    },
    {
      id: 'SCALE-002',
      name: 'No Batch Processing',
      check: (nodes: WorkflowNodeData[]) => {
        const processNodes = nodes.filter(n => n.type === 'action' || n.type === 'ai');
        const noBatching = processNodes.filter(n => !n.config?.batchSize);
        return noBatching.length > 2 ? noBatching : null;
      },
      severity: 'low' as const,
      title: 'Missing Batch Configuration',
      description: 'Processing items one-by-one limits throughput.',
      costImpact: 20,
      timeImpact: 3000,
      reliabilityImpact: 0,
      recommendation: 'Enable batch processing to handle multiple items per execution.',
      autoFixable: true,
    },
    {
      id: 'SCALE-003',
      name: 'No Queue Integration',
      check: (nodes: WorkflowNodeData[]) => {
        const triggers = nodes.filter(n => n.type === 'trigger');
        const noQueue = triggers.filter(n => !n.config?.queueEnabled);
        return noQueue.length > 0 && nodes.length > 4 ? noQueue : null;
      },
      severity: 'low' as const,
      title: 'No Message Queue',
      description: 'Without a queue, high-volume triggers may overwhelm the workflow.',
      costImpact: 0,
      timeImpact: 0,
      reliabilityImpact: -10,
      recommendation: 'Add queue-based trigger handling for high-volume scenarios.',
      autoFixable: false,
    },
  ],
};

export function scanWorkflow(nodes: WorkflowNodeData[], workflowName: string): ScanResult {
  const startTime = Date.now();
  const findings: ScanFinding[] = [];
  
  // Run all scans
  Object.entries(SCAN_RULES).forEach(([category, rules]) => {
    rules.forEach(rule => {
      const result = rule.check(nodes);
      if (result) {
        findings.push({
          id: rule.id,
          category: category as ScanFinding['category'],
          severity: rule.severity,
          title: rule.title,
          description: rule.description,
          impact: {
            costImpact: rule.costImpact,
            timeImpact: rule.timeImpact,
            reliabilityImpact: rule.reliabilityImpact,
          },
          recommendation: rule.recommendation,
          affectedNodes: Array.isArray(result) ? result.map(n => n.id) : [],
          autoFixable: rule.autoFixable || false,
        });
      }
    });
  });
  
  // Calculate scores
  const categoryScores = calculateCategoryScores(findings);
  const overallScore = Math.round(
    (categoryScores.performance + categoryScores.cost + 
     categoryScores.reliability + categoryScores.security + 
     categoryScores.scalability) / 5
  );
  
  // Calculate optimization potential
  const costSavingsPerExec = findings.reduce((sum, f) => sum + f.impact.costImpact, 0);
  const avgExecutionsPerDay = 100; // assumption
  const costSavingsPerYear = (costSavingsPerExec / 100) * avgExecutionsPerDay * 365;
  
  const totalTimeImpact = findings.reduce((sum, f) => sum + f.impact.timeImpact, 0);
  const avgExecTime = nodes.length * 2000; // assumption: 2s per node
  const timeReductionPercent = Math.min(Math.round((totalTimeImpact / avgExecTime) * 100), 80);
  
  const reliabilityImpact = findings.reduce((sum, f) => sum + f.impact.reliabilityImpact, 0);
  const reliabilityImprovement = Math.abs(reliabilityImpact);
  
  return {
    scanId: `scan-${Date.now()}`,
    timestamp: new Date().toISOString(),
    workflowName,
    overallScore,
    categoryScores,
    findings,
    optimizationPotential: {
      costSavingsPerYear,
      timeReductionPercent,
      reliabilityImprovement,
    },
    scanDuration: Date.now() - startTime,
  };
}

function calculateCategoryScores(findings: ScanFinding[]): ScanResult['categoryScores'] {
  const categories = ['performance', 'cost', 'reliability', 'security', 'scalability'] as const;
  const severityPenalty = { critical: 30, high: 20, medium: 10, low: 5, info: 2 };
  
  const scores = {} as ScanResult['categoryScores'];
  
  categories.forEach(category => {
    const categoryFindings = findings.filter(f => f.category === category);
    const totalPenalty = categoryFindings.reduce(
      (sum, f) => sum + severityPenalty[f.severity], 
      0
    );
    scores[category] = Math.max(0, 100 - totalPenalty);
  });
  
  return scores;
}

export function calculateScanImpactOnROI(scanResult: ScanResult, baseROI: {
  annualSavings: number;
  roiPercent: number;
  breakEvenDays: number;
}): {
  adjustedAnnualSavings: number;
  adjustedROIPercent: number;
  adjustedBreakEvenDays: number;
  potentialAdditionalSavings: number;
  optimizationRecommendations: string[];
} {
  const { optimizationPotential } = scanResult;
  
  // Calculate adjusted metrics
  const potentialAdditionalSavings = optimizationPotential.costSavingsPerYear;
  const adjustedAnnualSavings = baseROI.annualSavings + potentialAdditionalSavings;
  
  // Reliability improvements increase effective ROI
  const reliabilityMultiplier = 1 + (optimizationPotential.reliabilityImprovement / 100);
  const adjustedROIPercent = baseROI.roiPercent * reliabilityMultiplier;
  
  // Time savings reduce effective break-even
  const timeMultiplier = 1 - (optimizationPotential.timeReductionPercent / 100);
  const adjustedBreakEvenDays = Math.max(1, Math.round(baseROI.breakEvenDays * timeMultiplier));
  
  // Generate priority recommendations
  const criticalFindings = scanResult.findings.filter(f => f.severity === 'critical' || f.severity === 'high');
  const optimizationRecommendations = criticalFindings
    .sort((a, b) => (b.impact.costImpact + b.impact.reliabilityImpact * 5) - (a.impact.costImpact + a.impact.reliabilityImpact * 5))
    .slice(0, 5)
    .map(f => `[${f.id}] ${f.recommendation}`);
  
  return {
    adjustedAnnualSavings,
    adjustedROIPercent,
    adjustedBreakEvenDays,
    potentialAdditionalSavings,
    optimizationRecommendations,
  };
}

export function generateScanReport(scanResult: ScanResult): string {
  let report = `# Workflow Scan Report\n\n`;
  report += `**Workflow:** ${scanResult.workflowName}\n`;
  report += `**Scan ID:** ${scanResult.scanId}\n`;
  report += `**Date:** ${new Date(scanResult.timestamp).toLocaleString()}\n`;
  report += `**Duration:** ${scanResult.scanDuration}ms\n\n`;
  
  report += `## Overall Score: ${scanResult.overallScore}/100\n\n`;
  
  report += `### Category Scores\n\n`;
  report += `| Category | Score |\n|----------|-------|\n`;
  Object.entries(scanResult.categoryScores).forEach(([cat, score]) => {
    const emoji = score >= 80 ? '✅' : score >= 60 ? '⚠️' : '❌';
    report += `| ${cat.charAt(0).toUpperCase() + cat.slice(1)} | ${emoji} ${score}/100 |\n`;
  });
  
  report += `\n## Optimization Potential\n\n`;
  report += `- **Cost Savings:** $${scanResult.optimizationPotential.costSavingsPerYear.toLocaleString()}/year\n`;
  report += `- **Time Reduction:** ${scanResult.optimizationPotential.timeReductionPercent}%\n`;
  report += `- **Reliability Improvement:** ${scanResult.optimizationPotential.reliabilityImprovement}%\n\n`;
  
  if (scanResult.findings.length > 0) {
    report += `## Findings (${scanResult.findings.length})\n\n`;
    
    const groupedBySeverity = scanResult.findings.reduce((acc, f) => {
      if (!acc[f.severity]) acc[f.severity] = [];
      acc[f.severity].push(f);
      return acc;
    }, {} as Record<string, ScanFinding[]>);
    
    ['critical', 'high', 'medium', 'low', 'info'].forEach(severity => {
      const findings = groupedBySeverity[severity];
      if (findings && findings.length > 0) {
        report += `### ${severity.toUpperCase()} (${findings.length})\n\n`;
        findings.forEach(f => {
          report += `#### ${f.id}: ${f.title}\n\n`;
          report += `${f.description}\n\n`;
          report += `**Impact:** $${f.impact.costImpact / 100}/exec, ${f.impact.timeImpact}ms latency, ${f.impact.reliabilityImpact}% reliability\n\n`;
          report += `**Recommendation:** ${f.recommendation}\n\n`;
          if (f.autoFixable) report += `🔧 *Auto-fixable*\n\n`;
          report += `---\n\n`;
        });
      }
    });
  } else {
    report += `## No Issues Found\n\nYour workflow passes all scans! 🎉\n`;
  }
  
  return report;
}
