import { WorkflowNodeData } from "@/types/workflow";
import JSZip from "jszip";
import html2canvas from "html2canvas";

interface ROICalculation {
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

function calculateROI(nodes: WorkflowNodeData[]): ROICalculation {
  // Estimate based on workflow complexity
  const nodeCount = nodes.length;
  const hasAI = nodes.some(n => n.type === 'ai');
  const hasIntegrations = nodes.some(n => n.type === 'action');
  
  // Time savings estimates
  const manualHoursPerDay = Math.min(nodeCount * 0.5, 8); // Each node saves ~30min manual work
  const automatedMinutesPerDay = nodeCount * 2; // Automation takes 2min per node
  const hoursSavedPerDay = manualHoursPerDay - (automatedMinutesPerDay / 60);
  const annualHoursSaved = hoursSavedPerDay * 365;
  
  // Cost calculations
  const hourlyRate = hasAI ? 35 : 25; // Higher value work if AI involved
  const dailyManualCost = manualHoursPerDay * hourlyRate;
  const dailyAutomationCost = hasAI ? 2.5 : 0.5; // AI costs more in API fees
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
      timeFreedup: `${Math.round(annualHoursSaved)} hours per year can be redirected to revenue-generating activities`,
      scalingCapacity: `Can now handle ${Math.round(nodeCount * 10)}x more volume with the same effort`,
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

function generateWorkflowJSON(nodes: WorkflowNodeData[], workflowName: string): string {
  return JSON.stringify({
    name: workflowName,
    version: "1.0.0",
    platform: "FlowFuse",
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
    }))
  }, null, 2);
}

function generateReasoningMD(nodes: WorkflowNodeData[]): string {
  let md = `# Workflow Reasoning\n\n`;
  md += `## Overview\n\nThis workflow was designed to automate a process that would otherwise require manual intervention at each step.\n\n`;
  md += `## Node-by-Node Analysis\n\n`;
  
  nodes.forEach((node, index) => {
    md += `### ${index + 1}. ${node.title} (${node.type})\n\n`;
    md += `**Purpose:** ${node.description}\n\n`;
    
    switch (node.type) {
      case 'trigger':
        md += `**Why it exists:** Triggers are the entry point for workflows. This ensures the automation starts at the right moment.\n\n`;
        md += `**Logic:** Monitors for specific events and initiates the workflow when conditions are met.\n\n`;
        break;
      case 'ai':
        md += `**Why it exists:** AI nodes add intelligence to handle unstructured data, make decisions, or generate content.\n\n`;
        md += `**Logic:** Uses machine learning models to analyze, classify, or transform data in ways rule-based systems cannot.\n\n`;
        md += `**Alternative approaches considered:** Manual review (too slow), simple keyword matching (too rigid).\n\n`;
        break;
      case 'action':
        md += `**Why it exists:** Actions execute the actual work - sending notifications, updating databases, calling APIs.\n\n`;
        md += `**Logic:** Takes processed data and performs concrete operations with external systems.\n\n`;
        break;
      case 'condition':
        md += `**Why it exists:** Conditional logic creates branching paths based on data values or business rules.\n\n`;
        md += `**Logic:** Evaluates criteria and routes workflow execution down different paths.\n\n`;
        break;
      case 'data':
        md += `**Why it exists:** Data transformations clean, format, or enrich information before use.\n\n`;
        md += `**Logic:** Manipulates data structure or content to match downstream requirements.\n\n`;
        break;
    }
    
    if (index < nodes.length - 1) {
      md += `**Connects to:** ${nodes[index + 1].title}\n\n`;
    }
    
    md += `---\n\n`;
  });
  
  return md;
}

function generateROIAnalysisMD(roi: ROICalculation, workflowName: string): string {
  let md = `# ROI Analysis: ${workflowName}\n\n`;
  
  md += `## Executive Summary\n\n`;
  md += `- **Annual Savings:** $${Math.round(roi.costSavings.annualSavings).toLocaleString()}\n`;
  md += `- **Break-Even:** ${roi.breakEven.daysToBreakEven} days\n`;
  md += `- **First Year ROI:** ${Math.round(roi.breakEven.roiAfterOneYear)}%\n`;
  md += `- **Time Saved:** ${Math.round(roi.timeSavings.annualHoursSaved)} hours/year\n\n`;
  
  md += `## Time Savings\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Manual process time | ${roi.timeSavings.manualHoursPerDay.toFixed(1)} hours/day |\n`;
  md += `| Automated process time | ${roi.timeSavings.automatedMinutesPerDay} minutes/day |\n`;
  md += `| Time saved per day | ${roi.timeSavings.hoursSavedPerDay.toFixed(1)} hours |\n`;
  md += `| Annual hours saved | ${Math.round(roi.timeSavings.annualHoursSaved)} hours |\n\n`;
  
  md += `## Cost Savings\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Hourly labor rate | $${roi.costSavings.hourlyRate}/hr |\n`;
  md += `| Daily cost (manual) | $${roi.costSavings.dailyManualCost.toFixed(2)} |\n`;
  md += `| Daily cost (automated) | $${roi.costSavings.dailyAutomationCost.toFixed(2)} |\n`;
  md += `| Net daily savings | $${roi.costSavings.netDailySavings.toFixed(2)} |\n`;
  md += `| **Annual savings** | **$${Math.round(roi.costSavings.annualSavings).toLocaleString()}** |\n\n`;
  
  md += `## Revenue Potential\n\n`;
  md += `- **Time freed up:** ${roi.revenuePotential.timeFreedup}\n`;
  md += `- **Scaling capacity:** ${roi.revenuePotential.scalingCapacity}\n`;
  md += `- **Customer satisfaction:** ${roi.revenuePotential.customerSatisfaction}\n\n`;
  
  md += `## Break-Even Analysis\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Setup time investment | ${roi.breakEven.setupTimeHours.toFixed(1)} hours |\n`;
  md += `| Setup cost | $${Math.round(roi.breakEven.setupCost)} |\n`;
  md += `| Days to break even | ${roi.breakEven.daysToBreakEven} days |\n`;
  md += `| ROI after 1 year | ${Math.round(roi.breakEven.roiAfterOneYear)}% |\n\n`;
  
  md += `## 5-Year Projection\n\n`;
  const year1 = roi.costSavings.annualSavings - roi.breakEven.setupCost;
  const year2 = roi.costSavings.annualSavings * 1.1; // 10% improvement
  const year3 = roi.costSavings.annualSavings * 1.2;
  const year4 = roi.costSavings.annualSavings * 1.3;
  const year5 = roi.costSavings.annualSavings * 1.4;
  const total5Year = year1 + year2 + year3 + year4 + year5;
  
  md += `| Year | Net Savings |\n`;
  md += `|------|-------------|\n`;
  md += `| Year 1 | $${Math.round(year1).toLocaleString()} |\n`;
  md += `| Year 2 | $${Math.round(year2).toLocaleString()} |\n`;
  md += `| Year 3 | $${Math.round(year3).toLocaleString()} |\n`;
  md += `| Year 4 | $${Math.round(year4).toLocaleString()} |\n`;
  md += `| Year 5 | $${Math.round(year5).toLocaleString()} |\n`;
  md += `| **Total** | **$${Math.round(total5Year).toLocaleString()}** |\n\n`;
  
  return md;
}

function generateImplementationGuideMD(nodes: WorkflowNodeData[]): string {
  const hasAI = nodes.some(n => n.type === 'ai');
  const hasActions = nodes.some(n => n.type === 'action');
  
  let md = `# Implementation Guide\n\n`;
  md += `## Prerequisites\n\n`;
  
  if (hasAI) {
    md += `### AI Services\n`;
    md += `- OpenAI API key (for GPT models) OR\n`;
    md += `- Anthropic API key (for Claude models)\n`;
    md += `- Estimated cost: $0.10-$2.50 per workflow execution\n\n`;
  }
  
  if (hasActions) {
    md += `### Integration Access\n`;
    md += `- API keys for connected services (email, CRM, databases)\n`;
    md += `- Webhook endpoints configured\n`;
    md += `- Authentication credentials secured\n\n`;
  }
  
  md += `## Step-by-Step Setup\n\n`;
  
  nodes.forEach((node, index) => {
    md += `### Step ${index + 1}: Configure ${node.title}\n\n`;
    
    switch (node.type) {
      case 'trigger':
        md += `1. Define the triggering event (form submission, webhook, schedule)\n`;
        md += `2. Set up any required authentication\n`;
        md += `3. Test trigger activation manually\n`;
        md += `4. Verify data payload format\n\n`;
        break;
      case 'ai':
        md += `1. Choose your AI provider (OpenAI, Anthropic, Google)\n`;
        md += `2. Add API key to environment variables\n`;
        md += `3. Configure prompt template\n`;
        md += `4. Set temperature and max tokens\n`;
        md += `5. Test with sample data\n\n`;
        break;
      case 'action':
        md += `1. Obtain API credentials for target service\n`;
        md += `2. Configure connection settings\n`;
        md += `3. Map data fields from previous steps\n`;
        md += `4. Set error handling behavior\n`;
        md += `5. Test action with sample payload\n\n`;
        break;
      case 'condition':
        md += `1. Define evaluation criteria\n`;
        md += `2. Set up branching logic\n`;
        md += `3. Configure fallback behavior\n`;
        md += `4. Test both paths\n\n`;
        break;
      case 'data':
        md += `1. Define data transformation rules\n`;
        md += `2. Set up field mappings\n`;
        md += `3. Configure validation rules\n`;
        md += `4. Test with various input formats\n\n`;
        break;
    }
  });
  
  md += `## Testing Checklist\n\n`;
  md += `- [ ] Trigger activates correctly\n`;
  md += `- [ ] Data flows between all nodes\n`;
  md += `- [ ] Error handling works as expected\n`;
  md += `- [ ] AI responses are relevant and accurate\n`;
  md += `- [ ] Actions execute successfully\n`;
  md += `- [ ] Edge cases are handled gracefully\n`;
  md += `- [ ] Performance meets requirements\n\n`;
  
  md += `## Common Troubleshooting\n\n`;
  md += `### Workflow doesn't trigger\n`;
  md += `- Verify webhook URL is correct\n`;
  md += `- Check authentication credentials\n`;
  md += `- Confirm trigger event format matches expected structure\n\n`;
  
  if (hasAI) {
    md += `### AI node returns errors\n`;
    md += `- Verify API key is valid and has credits\n`;
    md += `- Check rate limits haven't been exceeded\n`;
    md += `- Ensure prompt isn't too long (check token limits)\n`;
    md += `- Review input data format\n\n`;
  }
  
  md += `### Action fails to execute\n`;
  md += `- Verify API credentials are current\n`;
  md += `- Check service status (is the external API down?)\n`;
  md += `- Review data mapping - are all required fields present?\n`;
  md += `- Check network connectivity and firewall rules\n\n`;
  
  md += `## Optimization Tips\n\n`;
  md += `1. **Caching:** Store repeated AI results to reduce API costs\n`;
  md += `2. **Batching:** Process multiple items together when possible\n`;
  md += `3. **Async execution:** Don't wait for non-critical steps\n`;
  md += `4. **Error retry:** Add exponential backoff for transient failures\n`;
  md += `5. **Monitoring:** Set up alerts for failures and performance issues\n\n`;
  
  md += `## Support Resources\n\n`;
  md += `- FlowFuse Documentation: https://flowfuse.ai/docs\n`;
  md += `- Community Forum: https://community.flowfuse.ai\n`;
  md += `- API Status Page: https://status.flowfuse.ai\n\n`;
  
  return md;
}

export async function generateWorkflowDownloadPackage(
  nodes: WorkflowNodeData[],
  workflowName: string
): Promise<Blob> {
  const zip = new JSZip();
  
  // Calculate ROI
  const roi = calculateROI(nodes);
  
  // Generate all files
  const workflowJSON = generateWorkflowJSON(nodes, workflowName);
  const reasoningMD = generateReasoningMD(nodes);
  const roiAnalysisMD = generateROIAnalysisMD(roi, workflowName);
  const implementationMD = generateImplementationGuideMD(nodes);
  
  // Add files to ZIP
  zip.file("workflow.json", workflowJSON);
  zip.file("reasoning.md", reasoningMD);
  zip.file("roi-analysis.md", roiAnalysisMD);
  zip.file("implementation-guide.md", implementationMD);
  
  // Add README
  const readme = `# ${workflowName}\n\n` +
    `**Generated by FlowFuse Enterprise AI**\n\n` +
    `This package contains everything you need to understand and implement this workflow.\n\n` +
    `## Package Contents\n\n` +
    `- **workflow.json** - Executable workflow file (import to n8n, Make, or any compatible platform)\n` +
    `- **reasoning.md** - Why each node exists and how they work together\n` +
    `- **roi-analysis.md** - Financial impact analysis and projections\n` +
    `- **implementation-guide.md** - Step-by-step setup instructions\n\n` +
    `## Quick Stats\n\n` +
    `- Annual Savings: $${Math.round(roi.costSavings.annualSavings).toLocaleString()}\n` +
    `- Break-Even: ${roi.breakEven.daysToBreakEven} days\n` +
    `- ROI (Year 1): ${Math.round(roi.breakEven.roiAfterOneYear)}%\n\n` +
    `---\n\n` +
    `*FlowFuse: Built for neurodivergent entrepreneurs and mobile-first creators*\n`;
  
  zip.file("README.md", readme);
  
  // Generate ZIP blob
  return await zip.generateAsync({ type: "blob" });
}
