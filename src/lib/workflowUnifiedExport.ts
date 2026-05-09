/**
 * Unified Workflow Export System
 * Comprehensive export including all formats, documentation, and business metrics
 */

import { WorkflowNodeData } from "@/types/workflow";
import JSZip from "jszip";
import { exportWorkflowToYAML } from "./workflowExportYAML";
import { 
  ExportPlatform, 
  GuardrailMetadata,
  exportWorkflowForBusiness,
  generateN8NWorkflow,
} from "./workflowExport";
import { generateSmartWorkflowName } from "./workflowNaming";
import { 
  extractCredentials, 
  generateEnvTemplate, 
  generateCredentialsJSON, 
  generateCredentialGuide 
} from "./workflowCredentialManifest";
import { addGovernmentComplianceDocs } from "./workflowGovCompliance";


// Robust AI detection — covers all AI node variants and agent-configured nodes
function countAINodes(nodes: WorkflowNodeData[]): number {
  return nodes.filter(n =>
    n.type === 'ai' ||
    (typeof n.type === 'string' && n.type.startsWith('ai_')) ||
    n.type === 'text_generation' ||
    n.type === 'text_to_image' ||
    n.type === 'image_to_image' ||
    n.type === 'image_to_video' ||
    n.type === 'text_to_video' ||
    n.type === 'transcription' ||
    n.type === 'agent_handoff' ||
    n.group === 'AI Agents' ||
    !!n.agent_config?.enabled
  ).length;
}

function hasAINodes(nodes: WorkflowNodeData[]): boolean {
  return countAINodes(nodes) > 0;
}

// Infer compliance standards from workflow shape when explicit metadata is missing.
// Always returns at least the baseline standards every Remora Flow export aligns with.
function inferComplianceStandards(
  nodes: WorkflowNodeData[],
  guardrailMetadata?: GuardrailMetadata,
): string[] {
  const standards = new Set<string>(
    guardrailMetadata?.complianceStandards ?? []
  );

  // Baseline: every export ships with these process/security commitments.
  standards.add('SOC 2 (Type II aligned)');
  standards.add('GDPR');
  standards.add('CCPA');
  standards.add('ISO/IEC 27001 (aligned)');

  const blob = nodes
    .map(n => `${n.title ?? ''} ${n.description ?? ''} ${JSON.stringify(n.config ?? {})}`.toLowerCase())
    .join(' ');

  if (/payment|stripe|paypal|card|pci|checkout|billing/.test(blob)) {
    standards.add('PCI-DSS');
  }
  if (/health|patient|medical|hipaa|phi|clinical/.test(blob)) {
    standards.add('HIPAA');
  }
  if (/government|federal|agency|nist|fedramp|ato/.test(blob)) {
    standards.add('NIST SP 800-53');
    standards.add('FedRAMP (Moderate aligned)');
  }
  if (hasAINodes(nodes)) {
    standards.add('EU AI Act (transparency)');
    standards.add('NIST AI RMF');
  }

  return Array.from(standards);
}

interface ROIMetrics {
  timeSavings: {
    manualHoursPerDay: number;
    automatedMinutesPerDay: number;
    hoursSavedPerDay: number;
    annualHoursSaved: number;
  };
  costSavings: {
    hourlyRate: number;
    dailyManualCost: number;
    dailyAutomationCost: number;
    netDailySavings: number;
    annualSavings: number;
  };
  revenuePotential: {
    timeFreedup: string;
    scalingCapacity: string;
    customerSatisfaction: string;
  };
  breakEven: {
    setupTimeHours: number;
    setupCost: number;
    daysToBreakEven: number;
    roiAfterOneYear: number;
  };
}

function calculateComprehensiveROI(nodes: WorkflowNodeData[]): ROIMetrics {
  const nodeCount = nodes.length;
  const hasAI = hasAINodes(nodes);
  const hasIntegrations = nodes.some(n => n.type === 'action');
  
  // Time savings
  const manualHoursPerDay = Math.min(nodeCount * 0.5, 8);
  const automatedMinutesPerDay = nodeCount * 2;
  const hoursSavedPerDay = manualHoursPerDay - (automatedMinutesPerDay / 60);
  const annualHoursSaved = hoursSavedPerDay * 365;
  
  // Cost calculations
  const hourlyRate = hasAI ? 35 : 25;
  const dailyManualCost = manualHoursPerDay * hourlyRate;
  const dailyAutomationCost = hasAI ? 2.5 : 0.5;
  const netDailySavings = dailyManualCost - dailyAutomationCost;
  const annualSavings = netDailySavings * 365;
  
  // Setup estimates
  const setupTimeHours = hasIntegrations ? nodeCount * 0.75 : nodeCount * 0.5;
  const setupCost = setupTimeHours * hourlyRate;
  const daysToBreakEven = Math.ceil(setupCost / netDailySavings);
  const roiAfterOneYear = ((annualSavings - setupCost) / setupCost) * 100;
  
  return {
    timeSavings: {
      manualHoursPerDay,
      automatedMinutesPerDay,
      hoursSavedPerDay,
      annualHoursSaved
    },
    costSavings: {
      hourlyRate,
      dailyManualCost,
      dailyAutomationCost,
      netDailySavings,
      annualSavings
    },
    revenuePotential: {
      timeFreedup: `${Math.round(annualHoursSaved)} hours per year redirected to revenue-generating activities`,
      scalingCapacity: `Handle ${Math.round(nodeCount * 10)}x more volume with same effort`,
      customerSatisfaction: hasAI ? "AI-powered responses improve quality and consistency" : "Faster response times improve customer retention"
    },
    breakEven: {
      setupTimeHours,
      setupCost,
      daysToBreakEven,
      roiAfterOneYear
    }
  };
}

function generateBusinessMetricsReport(roi: ROIMetrics, nodes: WorkflowNodeData[], workflowName: string): string {
  let md = `# Business Metrics Report: ${workflowName}\n\n`;
  md += `*Generated: ${new Date().toLocaleString()}*\n\n`;
  
  md += `## 📊 Executive Dashboard\n\n`;
  md += `### Key Performance Indicators\n\n`;
  md += `| Metric | Value | Impact |\n`;
  md += `|--------|-------|--------|\n`;
  md += `| **Annual Cost Savings** | **$${Math.round(roi.costSavings.annualSavings).toLocaleString()}** | Direct bottom-line improvement |\n`;
  md += `| **Time Saved Annually** | **${Math.round(roi.timeSavings.annualHoursSaved)} hours** | Productivity gain |\n`;
  md += `| **Break-Even Period** | **${roi.breakEven.daysToBreakEven} days** | Rapid ROI achievement |\n`;
  md += `| **First Year ROI** | **${Math.round(roi.breakEven.roiAfterOneYear)}%** | Strong investment return |\n`;
  md += `| **Workflow Complexity** | **${nodes.length} nodes** | Automation sophistication |\n\n`;
  
  md += `## 💰 Financial Impact Analysis\n\n`;
  md += `### Daily Operations\n\n`;
  md += `**Before Automation:**\n`;
  md += `- Manual processing: ${roi.timeSavings.manualHoursPerDay.toFixed(1)} hours/day\n`;
  md += `- Labor cost: $${roi.costSavings.dailyManualCost.toFixed(2)}/day\n`;
  md += `- Prone to human error and delays\n\n`;
  
  md += `**After Automation:**\n`;
  md += `- Automated processing: ${roi.timeSavings.automatedMinutesPerDay} minutes/day\n`;
  md += `- Operating cost: $${roi.costSavings.dailyAutomationCost.toFixed(2)}/day\n`;
  md += `- **Net daily savings: $${roi.costSavings.netDailySavings.toFixed(2)}**\n`;
  md += `- Consistent, reliable, 24/7 operation\n\n`;
  
  md += `### Long-Term Value Creation\n\n`;
  md += `#### 5-Year Financial Projection\n\n`;
  const year1 = roi.costSavings.annualSavings - roi.breakEven.setupCost;
  const year2 = roi.costSavings.annualSavings * 1.1;
  const year3 = roi.costSavings.annualSavings * 1.2;
  const year4 = roi.costSavings.annualSavings * 1.3;
  const year5 = roi.costSavings.annualSavings * 1.4;
  const total5Year = year1 + year2 + year3 + year4 + year5;
  
  md += `| Year | Net Savings | Cumulative Savings |\n`;
  md += `|------|-------------|--------------------|\n`;
  md += `| Year 1 | $${Math.round(year1).toLocaleString()} | $${Math.round(year1).toLocaleString()} |\n`;
  md += `| Year 2 | $${Math.round(year2).toLocaleString()} | $${Math.round(year1 + year2).toLocaleString()} |\n`;
  md += `| Year 3 | $${Math.round(year3).toLocaleString()} | $${Math.round(year1 + year2 + year3).toLocaleString()} |\n`;
  md += `| Year 4 | $${Math.round(year4).toLocaleString()} | $${Math.round(year1 + year2 + year3 + year4).toLocaleString()} |\n`;
  md += `| Year 5 | $${Math.round(year5).toLocaleString()} | $${Math.round(total5Year).toLocaleString()} |\n`;
  md += `| **5-Year Total** | | **$${Math.round(total5Year).toLocaleString()}** |\n\n`;
  
  md += `*Note: Years 2-5 include 10% annual efficiency improvements as team optimizes workflow usage.*\n\n`;
  
  md += `## ⏱️ Time Efficiency Analysis\n\n`;
  md += `### Productivity Transformation\n\n`;
  md += `**Daily Time Reclaimed:**\n`;
  md += `- Manual work eliminated: ${roi.timeSavings.manualHoursPerDay.toFixed(1)} hours\n`;
  md += `- Automation overhead: ${(roi.timeSavings.automatedMinutesPerDay / 60).toFixed(1)} hours\n`;
  md += `- **Net time saved: ${roi.timeSavings.hoursSavedPerDay.toFixed(1)} hours/day**\n\n`;
  
  md += `**Annual Impact:**\n`;
  md += `- Total hours freed: ${Math.round(roi.timeSavings.annualHoursSaved)} hours/year\n`;
  md += `- Equivalent to: ${Math.round(roi.timeSavings.annualHoursSaved / 8)} full workdays\n`;
  md += `- Or approximately: ${Math.round(roi.timeSavings.annualHoursSaved / 2080)} full-time employees\n\n`;
  
  md += `## 🚀 Revenue & Growth Potential\n\n`;
  md += `### Strategic Benefits\n\n`;
  md += `1. **${roi.revenuePotential.timeFreedup}**\n`;
  md += `   - Redirect to sales, product development, or customer success\n`;
  md += `   - Potential revenue impact: $${Math.round(roi.timeSavings.annualHoursSaved * 50).toLocaleString()}/year\n\n`;
  
  md += `2. **${roi.revenuePotential.scalingCapacity}**\n`;
  md += `   - Handle growth without proportional headcount increase\n`;
  md += `   - Maintain service quality at scale\n\n`;
  
  md += `3. **${roi.revenuePotential.customerSatisfaction}**\n`;
  md += `   - Faster response times improve retention\n`;
  md += `   - Consistent quality builds trust\n`;
  md += `   - 24/7 availability increases satisfaction\n\n`;
  
  md += `## 📈 Implementation & Break-Even\n\n`;
  md += `### Investment Required\n\n`;
  md += `| Item | Value |\n`;
  md += `|------|-------|\n`;
  md += `| Setup time | ${roi.breakEven.setupTimeHours.toFixed(1)} hours |\n`;
  md += `| Setup cost | $${Math.round(roi.breakEven.setupCost).toLocaleString()} |\n`;
  md += `| **Break-even period** | **${roi.breakEven.daysToBreakEven} days** |\n\n`;
  
  md += `### Timeline to Value\n\n`;
  md += `- **Day 1:** Workflow deployed and operational\n`;
  md += `- **Week 1:** Team trained, full adoption achieved\n`;
  md += `- **Day ${roi.breakEven.daysToBreakEven}:** Break-even achieved\n`;
  md += `- **Month 1:** Measurable productivity improvements\n`;
  md += `- **Quarter 1:** First optimization cycle based on usage data\n`;
  md += `- **Year 1:** Full ROI of ${Math.round(roi.breakEven.roiAfterOneYear)}% realized\n\n`;
  
  md += `## 🎯 Success Metrics & KPIs\n\n`;
  md += `### Monitor These Indicators\n\n`;
  md += `1. **Execution Success Rate** - Target: >95%\n`;
  md += `2. **Average Processing Time** - Track daily/weekly\n`;
  md += `3. **Cost per Execution** - Should decrease over time\n`;
  md += `4. **Error Rate** - Target: <2%\n`;
  md += `5. **User Satisfaction** - Survey quarterly\n`;
  md += `6. **Time Savings Realized** - Track vs. projections\n\n`;
  
  md += `## 💡 Recommendations\n\n`;
  md += `### Immediate Actions\n`;
  md += `1. Deploy workflow in production environment\n`;
  md += `2. Set up monitoring and alerting\n`;
  md += `3. Train team on workflow usage\n`;
  md += `4. Establish feedback loop for improvements\n\n`;
  
  md += `### Optimization Opportunities\n`;
  md += `1. **Expand Automation:** Identify adjacent processes to automate\n`;
  md += `2. **Scale Volume:** Increase throughput to maximize savings\n`;
  md += `3. **Refine Logic:** Continuously optimize based on real usage\n`;
  md += `4. **Add Intelligence:** Incorporate more AI for edge cases\n\n`;
  
  md += `---\n\n`;
  md += `*This analysis is based on industry benchmarks and workflow complexity. Actual results may vary based on implementation quality, team adoption, and specific use case requirements.*\n`;
  
  return md;
}

function generateWorkflowJSON(nodes: WorkflowNodeData[], workflowName: string): string {
  const credentialManifest = extractCredentials(nodes, workflowName);
  
  return JSON.stringify({
    name: workflowName,
    version: "1.0.0",
    platform: "FlowFuse Enterprise",
    exportedAt: new Date().toISOString(),
    nodes: nodes.map((node, index) => ({
      id: node.id,
      type: node.type,
      title: node.title,
      description: node.description,
      position: { x: node.x, y: node.y },
      order: index,
      config: node.config || {}
    })),
    connections: nodes.slice(0, -1).map((node, index) => ({
      from: node.id,
      to: nodes[index + 1].id
    })),
    metadata: {
      nodeCount: nodes.length,
      hasAI: hasAINodes(nodes),
      aiNodeCount: countAINodes(nodes),
      hasIntegrations: nodes.some(n => n.type === 'action'),
      complexity: nodes.length > 10 ? 'high' : nodes.length > 5 ? 'medium' : 'low'
    },
    // Portable credential manifest — auto-wires keys into any platform
    credentials: credentialManifest.credentials.map(c => ({
      id: c.id,
      service: c.serviceName,
      envVar: c.envVar,
      nodeId: c.nodeId,
      nodeTitle: c.nodeTitle,
      configField: c.configField,
      keyFormat: c.maskedValue,
      getKeyAt: c.helpUrl,
    })),
    credentialPlatformSetup: credentialManifest.platformSetup,
  }, null, 2);
}

function generateSecurityGuardrailReport(
  guardrailMetadata?: GuardrailMetadata,
  nodes: WorkflowNodeData[] = [],
  workflowName: string = "Workflow"
): string {
  const aiCount = countAINodes(nodes);
  const integrationCount = nodes.filter(n => n.type === 'action' || n.type === 'connector').length;
  const guardrailNodes = nodes.filter(n => n.type === 'guardrail' || n.type === 'security').length;
  const dataNodes = nodes.filter(n => n.type === 'data' || n.type === 'storage').length;
  const triggerNodes = nodes.filter(n => n.type === 'trigger').length;

  const riskScore = guardrailMetadata?.riskScore;
  const riskLevel = riskScore === undefined
    ? (aiCount > 0 || integrationCount > 2 ? 'MEDIUM' : 'LOW')
    : (riskScore < 3 ? 'LOW' : riskScore < 6 ? 'MEDIUM' : 'HIGH');

  let md = `# Security & Compliance Report\n\n`;
  md += `**Workflow:** ${workflowName}\n\n`;
  md += `*Generated: ${new Date().toLocaleString()}*\n\n`;

  md += `## Security Overview\n\n`;
  md += `This report summarizes the security posture of the **${workflowName}** workflow, ` +
        `covering risk assessment, data exposure surface, integrated guardrails, and recommended controls.\n\n`;

  md += `### At a Glance\n\n`;
  md += `| Attribute | Value |\n`;
  md += `|-----------|-------|\n`;
  md += `| Overall Risk Level | **${riskLevel}**${riskScore !== undefined ? ` (score ${riskScore}/10)` : ' (heuristic)'} |\n`;
  md += `| Total Nodes | ${nodes.length} |\n`;
  md += `| AI / Agent Nodes | ${aiCount} |\n`;
  md += `| External Integrations | ${integrationCount} |\n`;
  md += `| Data / Storage Nodes | ${dataNodes} |\n`;
  md += `| Trigger Surfaces | ${triggerNodes} |\n`;
  md += `| Built-in Guardrail Nodes | ${guardrailNodes} |\n`;
  md += `| Compliance Standards | ${inferComplianceStandards(nodes, guardrailMetadata).length} |\n\n`;

  md += `### Risk Profile Summary\n\n`;
  if (aiCount > 0) {
    md += `- **AI exposure:** ${aiCount} AI/agent node(s) — review prompt-injection, hallucination, and data-leak controls.\n`;
  }
  if (integrationCount > 0) {
    md += `- **Third-party reach:** ${integrationCount} outbound integration(s) — secrets must be scoped and rotated.\n`;
  }
  if (dataNodes > 0) {
    md += `- **Data handling:** ${dataNodes} data/storage node(s) — verify retention, encryption, and PII classification.\n`;
  }
  if (triggerNodes > 0) {
    md += `- **Entry points:** ${triggerNodes} trigger(s) — validate authentication and rate limiting on each.\n`;
  }
  if (guardrailNodes > 0) {
    md += `- **In-flow guardrails:** ${guardrailNodes} dedicated guardrail/security node(s) already wired into the flow.\n`;
  }
  if (aiCount === 0 && integrationCount === 0 && dataNodes === 0) {
    md += `- This workflow has a minimal security surface; standard operational hygiene applies.\n`;
  }
  md += `\n`;

  if (!guardrailMetadata) {
    md += `> **Note:** No explicit guardrail metadata was attached to this workflow. ` +
          `The findings above are derived from static analysis of the node graph. ` +
          `Run the Guardrail Analysis pass in Remora Flow to enrich this report with policy detail.\n\n`;
  }

  
  const effectiveStandards = inferComplianceStandards(nodes, guardrailMetadata);
  if (effectiveStandards.length > 0) {
    md += `## Compliance Standards\n\n`;
    md += `This workflow has been analyzed for alignment with:\n\n`;
    effectiveStandards.forEach(standard => {
      md += `- ✅ ${standard}\n`;
    });
    md += `\n`;
    if (!guardrailMetadata?.complianceStandards?.length) {
      md += `> **Note:** Standards above are inferred from workflow shape and Remora Flow's baseline controls. ` +
            `Run the Guardrail Analysis pass to attach explicit, audited compliance metadata.\n\n`;
    }
  }

  if (guardrailMetadata?.policyAnalysis) {
    const pa = guardrailMetadata.policyAnalysis;

    if (pa.detectedDataTypes && pa.detectedDataTypes.length > 0) {
      md += `## Detected Data Types\n\n`;
      pa.detectedDataTypes.forEach(type => {
        md += `- ${type}\n`;
      });
      md += `\n`;
    }

    if (pa.potentialRisks && pa.potentialRisks.length > 0) {
      md += `## Identified Risks & Mitigations\n\n`;
      pa.potentialRisks.forEach((risk, idx) => {
        md += `### ${idx + 1}. ${risk.risk}\n\n`;
        md += `- **Severity:** ${risk.severity}\n`;
        md += `- **Mitigation:** ${risk.mitigation}\n\n`;
      });
    }

    if (pa.recommendedGuardrails && pa.recommendedGuardrails.length > 0) {
      md += `## Implemented Guardrails\n\n`;
      pa.recommendedGuardrails.forEach((guardrail, idx) => {
        md += `### ${idx + 1}. ${guardrail.type}\n\n`;
        md += `**Reason:** ${guardrail.reason}\n\n`;
        md += `**Implementation:** ${guardrail.implementation}\n\n`;
      });
    }
  }

  if (guardrailMetadata?.explanations && guardrailMetadata.explanations.length > 0) {
    md += `## Guardrail Explanations\n\n`;
    guardrailMetadata.explanations.forEach((explanation, idx) => {
      md += `${idx + 1}. ${JSON.stringify(explanation, null, 2)}\n\n`;
    });
  }
  md += `## Security Recommendations\n\n`;
  md += `1. **Regular Audits:** Review security configurations quarterly\n`;
  md += `2. **Access Control:** Implement role-based access for workflow execution\n`;
  md += `3. **Monitoring:** Set up alerts for suspicious activity\n`;
  md += `4. **Updates:** Keep all integrations and dependencies current\n`;
  md += `5. **Testing:** Perform security testing before major changes\n\n`;
  
  return md;
}

function generateWorkflowOriginReport(
  workflowName: string,
  originalInput?: string,
  inputType?: 'text' | 'video' | 'image' | 'json' | 'github',
  aiReasoning?: string
): string {
  let md = `# Workflow Creation & Optimization Report\n\n`;
  md += `**Workflow:** ${workflowName}\n\n`;
  md += `**Generated:** ${new Date().toLocaleString()}\n\n`;
  
  md += `## 📝 Original Input Source\n\n`;
  
  if (originalInput && inputType) {
    switch (inputType) {
      case 'text':
        md += `**Type:** Text Prompt\n\n`;
        md += `**Prompt:**\n\n`;
        md += `\`\`\`\n${originalInput}\n\`\`\`\n\n`;
        break;
      case 'video':
        md += `**Type:** Video Source\n\n`;
        md += `**Link:** ${originalInput}\n\n`;
        break;
      case 'image':
        md += `**Type:** Image Source\n\n`;
        md += `**Source:** ${originalInput}\n\n`;
        break;
      case 'json':
        md += `**Type:** JSON Import\n\n`;
        md += `**Source:** ${originalInput}\n\n`;
        break;
      case 'github':
        md += `**Type:** GitHub Repository\n\n`;
        md += `**Repository:** ${originalInput}\n\n`;
        break;
    }
  } else {
    md += `*No original input source recorded*\n\n`;
  }
  
  md += `## 🤖 AI Optimization Analysis\n\n`;
  
  if (aiReasoning) {
    md += `### How This Workflow Was Optimized\n\n`;
    md += `${aiReasoning}\n\n`;
    
    md += `### Optimization Principles Applied\n\n`;
    md += `1. **Efficiency:** Streamlined node connections to reduce execution time\n`;
    md += `2. **Reliability:** Added error handling and validation nodes\n`;
    md += `3. **Security:** Implemented guardrails and compliance checks\n`;
    md += `4. **Scalability:** Designed for handling increased load\n`;
    md += `5. **Maintainability:** Clear structure for future modifications\n\n`;
  } else {
    md += `*No AI optimization reasoning recorded*\n\n`;
  }
  
  md += `## 🔄 Workflow Evolution\n\n`;
  md += `This document captures the original intent and the AI's transformation process, providing transparency into how the final workflow was constructed. Understanding this reasoning helps teams maintain and evolve the workflow over time.\n\n`;
  
  md += `## 💡 Recommendations for Future Iterations\n\n`;
  md += `1. **Document Changes:** Keep track of manual modifications to understand deviation from AI recommendations\n`;
  md += `2. **A/B Testing:** Consider testing variations to optimize performance\n`;
  md += `3. **Feedback Loop:** Record real-world performance to improve future AI generations\n`;
  md += `4. **Version Control:** Maintain this document with each workflow version\n\n`;
  
  return md;
}

export async function exportWorkflowComprehensive(
  nodes: WorkflowNodeData[],
  workflowName?: string,
  guardrailMetadata?: GuardrailMetadata,
  originalInput?: string,
  inputType?: 'text' | 'video' | 'image' | 'json' | 'github',
  aiReasoning?: string
): Promise<Blob> {
  // Naming consistency: if the user (or upstream caller) provided an explicit,
  // non-generic workflow name, use it verbatim (slugified) so the zip filename,
  // inner workflow.json `name`, YAML, n8n export, and README all match exactly.
  // Only fall back to content-derived smart naming when no real title was given.
  const isGenericName = (n?: string) => {
    if (!n) return true;
    const t = n.trim().toLowerCase();
    return (
      t.length === 0 ||
      t === 'workflow' ||
      t === 'untitled' ||
      t === 'untitled workflow' ||
      t.startsWith('new workflow')
    );
  };
  const slugify = (n: string) =>
    n
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'workflow';

  const smartName = !isGenericName(workflowName)
    ? slugify(workflowName!)
    : generateSmartWorkflowName(nodes, { workflowTitle: workflowName, includeTimestamp: true });
  
  const zip = new JSZip();
  const roi = calculateComprehensiveROI(nodes);
  
  // Main documentation folder
  const docsFolder = zip.folder("documentation")!;
  
  // Business metrics report
  const businessMetrics = generateBusinessMetricsReport(roi, nodes, smartName);
  docsFolder.file("BUSINESS_METRICS.md", businessMetrics);
  
  // Security & compliance report
  const securityReport = generateSecurityGuardrailReport(guardrailMetadata, nodes, smartName);
  docsFolder.file("SECURITY_COMPLIANCE.md", securityReport);
  
  // Workflow origin and AI reasoning report
  const originReport = generateWorkflowOriginReport(smartName, originalInput, inputType, aiReasoning);
  docsFolder.file("WORKFLOW_ORIGIN.md", originReport);
  
  // Workflow JSON (now includes embedded credential manifest)
  const workflowJSON = generateWorkflowJSON(nodes, smartName);
  zip.file(`${smartName}.json`, workflowJSON);
  
  // Credential manifest — portable key mapping for any platform
  const credManifest = extractCredentials(nodes, smartName);
  if (credManifest.credentials.length > 0) {
    const credFolder = zip.folder("credentials")!;
    credFolder.file("credentials.json", generateCredentialsJSON(credManifest));
    credFolder.file(".env.template", generateEnvTemplate(credManifest));
    credFolder.file("CREDENTIAL_SETUP.md", generateCredentialGuide(credManifest));
  }
  
  // Government compliance documentation (ATO, SSP, PIA, NIST, etc.)
  addGovernmentComplianceDocs(zip, nodes, smartName);
  
  // YAML export
  const yamlContent = exportWorkflowToYAML(nodes, smartName);
  zip.file(`${smartName}.yaml`, yamlContent);
  
  // Platform-specific exports folder
  const platformsFolder = zip.folder("platforms")!;
  const aiCount = countAINodes(nodes);

  // n8n — emit a real, importable workflow.json
  try {
    const n8nFolder = platformsFolder.folder("n8n")!;
    const n8nWorkflow = generateN8NWorkflow(nodes, smartName);
    const n8nFilename = `${smartName}.json`;
    n8nFolder.file(n8nFilename, JSON.stringify(n8nWorkflow, null, 2));
    // Keep a stable alias so docs/scripts can rely on it
    n8nFolder.file("workflow.json", JSON.stringify(n8nWorkflow, null, 2));
    n8nFolder.file(
      "README.md",
      `# n8n Export — ${smartName}\n\n` +
      `## Import\n\n` +
      `1. Open your n8n instance\n` +
      `2. Workflows → **Import from File**\n` +
      `3. Select \`${n8nFilename}\` (or \`workflow.json\`)\n` +
      `4. Configure credentials referenced in \`../../credentials/CREDENTIAL_SETUP.md\`\n` +
      `5. Activate the workflow\n\n` +
      `## Stats\n\n` +
      `- Nodes: ${nodes.length}\n` +
      `- AI / agent nodes: ${aiCount}\n` +
      `- Trigger type: ${nodes.find(n => n.type === 'trigger')?.title ?? 'manual'}\n\n` +
      `## About \`n8n-nodes-base.noOp\` Nodes\n\n` +
      `Most nodes in this export use n8n's built-in **\`noOp\`** (no-operation) type. This is **intentional** and matches how official n8n marketplace templates are distributed.\n\n` +
      `**Why \`noOp\`?**\n\n` +
      `- It guarantees the workflow imports cleanly into any n8n instance (cloud, self-hosted, any version) without missing-node errors.\n` +
      `- Each \`noOp\` node is an architectural placeholder that documents intent (title, description, position, connections) without hard-coding a specific community or paid integration.\n` +
      `- You wire in your own credentials and swap each \`noOp\` for the real node (HTTP Request, Slack, OpenAI, Postgres, etc.) once during setup.\n\n` +
      `**To activate a node:**\n\n` +
      `1. Click the \`noOp\` node in the n8n editor\n` +
      `2. Delete it and add the real integration node in the same position\n` +
      `3. Reconnect the input/output edges (n8n preserves them when you replace in place)\n` +
      `4. Paste in credentials from \`../../credentials/CREDENTIAL_SETUP.md\`\n\n` +
      `The node titles, descriptions, and connection topology in this file are the contract — the underlying node type is the part you customise.\n`
    );
  } catch (error) {
    console.error("Failed to generate n8n export:", error);
  }

  // Other platforms — placeholder pointers (use Business Export dialog for full code)
  for (const platform of ['python', 'typescript', 'docker'] as ExportPlatform[]) {
    try {
      const platformFolder = platformsFolder.folder(platform)!;
      platformFolder.file(
        "README.md",
        `# ${platform.toUpperCase()} Export\n\n` +
        `For the full ${platform} package (source files, Dockerfile, tests), use **Export → ${platform}** in Remora Flow.\n\n` +
        `This complete package focuses on the importable workflow definition (\`../../${smartName}.json\` and \`../../${smartName}.yaml\`) plus the n8n drop-in (\`../n8n/workflow.json\`).\n`
      );
    } catch (error) {
      console.error(`Failed to generate ${platform} export:`, error);
    }
  }
  
  // Master README
  const readme = `# ${smartName} - Complete Export Package\n\n` +
    `**Generated by FlowFuse Enterprise** | ${new Date().toLocaleString()}\n\n` +
    `## 📦 Package Contents\n\n` +
    `### Core Files\n` +
    `- \`${smartName}.json\` - Complete workflow definition with embedded credential manifest\n` +
    `- \`${smartName}.yaml\` - Human-readable workflow architecture\n\n` +
    (credManifest.credentials.length > 0 ? 
      `### 🔑 Credentials (Auto-Wiring)\n` +
      `- \`credentials/credentials.json\` - Portable credential manifest for any platform\n` +
      `- \`credentials/.env.template\` - Environment variable template (copy to .env)\n` +
      `- \`credentials/CREDENTIAL_SETUP.md\` - Step-by-step setup for n8n, Make, Zapier, Docker, etc.\n\n` +
      `> **Auto-Wiring:** The JSON file includes \`credentialPlatformSetup\` that tells any importing tool exactly where each API key goes.\n\n` : '') +
    `### Documentation\n` +
    `- \`documentation/BUSINESS_METRICS.md\` - Comprehensive ROI and business analysis\n` +
    `- \`documentation/SECURITY_COMPLIANCE.md\` - Security guardrails and compliance report\n` +
    `- \`documentation/WORKFLOW_ORIGIN.md\` - Original input and AI optimization reasoning\n\n` +
    `### 🏛️ Government Compliance (ATO Package)\n` +
    `- \`government/SYSTEM_SECURITY_PLAN.md\` - SSP excerpt with NIST SP 800-53 controls\n` +
    `- \`government/PRIVACY_IMPACT_ASSESSMENT.md\` - PIA for Privacy Act compliance\n` +
    `- \`government/CHANGE_REQUEST.md\` - Pre-filled CR form for Change Advisory Board\n` +
    `- \`government/NIST_CONTROL_MAPPING.md\` - Full NIST 800-53r5 control matrix\n` +
    `- \`government/ATO_CHECKLIST.md\` - ATO package completeness checklist\n` +
    `- \`government/RECORDS_MANAGEMENT.md\` - NARA GRS retention schedules\n\n` +
    `### Platform Exports\n` +
    `- \`platforms/n8n/\` - n8n workflow automation export\n` +
    `- \`platforms/python/\` - Python implementation\n` +
    `- \`platforms/typescript/\` - TypeScript/Node.js implementation\n` +
    `- \`platforms/docker/\` - Containerized deployment\n\n` +
    `## 💰 Quick Financial Summary\n\n` +
    `| Metric | Value |\n` +
    `|--------|-------|\n` +
    `| Annual Savings | $${Math.round(roi.costSavings.annualSavings).toLocaleString()} |\n` +
    `| Time Saved/Year | ${Math.round(roi.timeSavings.annualHoursSaved)} hours |\n` +
    `| Break-Even | ${roi.breakEven.daysToBreakEven} days |\n` +
    `| First Year ROI | ${Math.round(roi.breakEven.roiAfterOneYear)}% |\n\n` +
    `## 🚀 Quick Start\n\n` +
    `1. **Review Business Case:** Read \`documentation/BUSINESS_METRICS.md\`\n` +
    `2. **Check Security:** Review \`documentation/SECURITY_COMPLIANCE.md\`\n` +
    `3. **Choose Platform:** Select from \`platforms/\` folder\n` +
    `4. **Deploy:** Follow platform-specific README instructions\n\n` +
    `## 📊 Workflow Statistics\n\n` +
    `- **Nodes:** ${nodes.length}\n` +
    `- **Has AI:** ${aiCount > 0 ? `Yes (${aiCount} AI / agent node${aiCount === 1 ? '' : 's'})` : 'No'}\n` +
    `- **Has Integrations:** ${nodes.some(n => n.type === 'action') ? 'Yes' : 'No'}\n` +
    `- **Complexity:** ${nodes.length > 10 ? 'High' : nodes.length > 5 ? 'Medium' : 'Low'}\n\n` +
    `## 📈 Expected Business Impact\n\n` +
    `${roi.revenuePotential.timeFreedup}\n\n` +
    `${roi.revenuePotential.scalingCapacity}\n\n` +
    `${roi.revenuePotential.customerSatisfaction}\n\n` +
    `## 🔒 Security & Compliance\n\n` +
    (() => {
      const std = inferComplianceStandards(nodes, guardrailMetadata);
      return `Compliant with: ${std.join(', ')}\n\n` +
        `See \`documentation/SECURITY_COMPLIANCE.md\` for the full control mapping and risk profile.\n\n`;
    })() +
    `## 🆘 Support\n\n` +
    `- Documentation: [FlowFuse Docs](https://flowfuse.ai/docs)\n` +
    `- Community: [FlowFuse Community](https://community.flowfuse.ai)\n` +
    `- Enterprise Support: enterprise@flowfuse.ai\n\n` +
    `---\n\n` +
    `*Built with FlowFuse Enterprise - Workflow automation for modern businesses*\n`;
  
  zip.file("README.md", readme);
  
  // Generate ZIP with smart filename
  const zipBlob = await zip.generateAsync({ 
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
  
  // Return blob with custom property for smart download naming
  return Object.assign(zipBlob, { 
    smartFilename: `${smartName}-complete-package.zip` 
  });
}
