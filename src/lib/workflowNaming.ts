/**
 * Smart Workflow Naming System
 * Generates intelligent, context-aware names for workflow exports
 */

import { WorkflowNodeData } from "@/types/workflow";

export interface NamingContext {
  workflowTitle?: string;
  version?: string;
  environment?: 'dev' | 'staging' | 'production';
  exportPlatform?: string;
  includeTimestamp?: boolean;
  includeHash?: boolean;
  format?: 'kebab' | 'snake' | 'camel' | 'pascal';
}

interface WorkflowSignature {
  category: string | null;
  primaryAction: string | null;
  platforms: string[];
  workflowType: string;
  complexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
  hasAI: boolean;
  hasGuardrails: boolean;
  nodeCount: number;
}

// Extended category detection with business domains
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'lead-gen': ['lead', 'prospect', 'inquiry', 'contact form', 'signup', 'capture'],
  'customer-success': ['customer', 'client', 'user onboard', 'retention', 'churn'],
  'invoicing': ['invoice', 'billing', 'payment', 'receipt', 'charge'],
  'ecommerce': ['order', 'purchase', 'checkout', 'cart', 'product', 'shop'],
  'support': ['support', 'ticket', 'help desk', 'issue', 'escalation'],
  'hr-ops': ['employee', 'hiring', 'recruitment', 'onboarding', 'hr', 'payroll'],
  'marketing': ['campaign', 'newsletter', 'marketing', 'promotion', 'email blast'],
  'sales': ['sales', 'deal', 'opportunity', 'quote', 'pipeline', 'crm'],
  'content': ['content', 'blog', 'article', 'post', 'publish', 'cms'],
  'analytics': ['data', 'report', 'analytics', 'sync', 'export', 'dashboard'],
  'notifications': ['notification', 'alert', 'reminder', 'notify', 'sms', 'push'],
  'document': ['document', 'pdf', 'file', 'contract', 'sign'],
  'social': ['social', 'twitter', 'linkedin', 'facebook', 'instagram', 'tiktok'],
  'scheduling': ['schedule', 'calendar', 'appointment', 'booking', 'meeting'],
  'compliance': ['compliance', 'audit', 'gdpr', 'hipaa', 'security', 'policy'],
};

// Extended action detection
const ACTION_KEYWORDS: Record<string, string[]> = {
  'intake': ['intake', 'receive', 'capture', 'collect', 'ingest'],
  'process': ['process', 'transform', 'parse', 'analyze', 'compute'],
  'summarize': ['summarize', 'summary', 'digest', 'brief', 'tldr'],
  'classify': ['classify', 'categorize', 'sort', 'tag', 'label', 'triage'],
  'enrich': ['enrich', 'enhance', 'augment', 'append', 'lookup'],
  'notify': ['notify', 'alert', 'send email', 'send message', 'ping'],
  'automate': ['automate', 'schedule', 'trigger', 'cron', 'recurring'],
  'route': ['route', 'distribute', 'assign', 'dispatch', 'forward'],
  'approve': ['approve', 'review', 'validate', 'verify', 'confirm'],
  'generate': ['generate', 'create', 'build', 'compose', 'draft'],
  'sync': ['sync', 'synchronize', 'mirror', 'replicate', 'backup'],
  'extract': ['extract', 'scrape', 'pull', 'fetch', 'retrieve'],
  'monitor': ['monitor', 'watch', 'track', 'observe', 'detect'],
  'respond': ['respond', 'reply', 'answer', 'feedback', 'auto-reply'],
};

// Platform detection with categories
const PLATFORMS: Record<string, string[]> = {
  'communication': ['email', 'gmail', 'outlook', 'slack', 'discord', 'telegram', 'teams', 'whatsapp'],
  'payments': ['stripe', 'paypal', 'square', 'braintree'],
  'productivity': ['calendar', 'sheets', 'airtable', 'notion', 'google-drive', 'dropbox'],
  'crm': ['hubspot', 'salesforce', 'pipedrive', 'zoho'],
  'project': ['jira', 'trello', 'asana', 'monday', 'linear'],
  'ecommerce': ['shopify', 'woocommerce', 'magento', 'bigcommerce'],
  'social': ['twitter', 'linkedin', 'facebook', 'instagram', 'tiktok', 'youtube'],
  'dev': ['github', 'gitlab', 'bitbucket', 'vercel', 'netlify'],
  'analytics': ['google-analytics', 'mixpanel', 'segment', 'amplitude'],
};

/**
 * Analyzes workflow to generate a semantic signature
 */
export function analyzeWorkflowSignature(nodes: WorkflowNodeData[]): WorkflowSignature {
  const allText = nodes.map(n => `${n.title} ${n.description || ''}`).join(' ').toLowerCase();
  
  // Detect category
  let category: string | null = null;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => allText.includes(kw))) {
      category = cat;
      break;
    }
  }
  
  // Detect primary action
  let primaryAction: string | null = null;
  for (const [action, keywords] of Object.entries(ACTION_KEYWORDS)) {
    if (keywords.some(kw => allText.includes(kw))) {
      primaryAction = action;
      break;
    }
  }
  
  // Detect platforms
  const platforms: string[] = [];
  for (const [, platformList] of Object.entries(PLATFORMS)) {
    for (const platform of platformList) {
      if (allText.includes(platform)) {
        platforms.push(platform);
      }
    }
  }
  
  // Analyze node composition
  const aiNodes = nodes.filter(n => n.type === 'ai');
  const actionNodes = nodes.filter(n => n.type === 'action');
  const conditionNodes = nodes.filter(n => n.type === 'condition');
  const guardrailNodes = nodes.filter(n => n.type === 'guardrail');
  
  // Determine workflow type
  let workflowType = 'workflow';
  if (aiNodes.length >= 3) {
    workflowType = 'multi-agent-pipeline';
  } else if (aiNodes.length >= 2) {
    workflowType = 'ai-chain';
  } else if (aiNodes.length === 1) {
    workflowType = 'ai-powered';
  } else if (conditionNodes.length >= 3) {
    workflowType = 'decision-tree';
  } else if (conditionNodes.length >= 1) {
    workflowType = 'branching';
  } else if (actionNodes.length >= 5) {
    workflowType = 'pipeline';
  } else if (actionNodes.length >= 3) {
    workflowType = 'automation';
  }
  
  // Determine complexity
  let complexity: 'simple' | 'moderate' | 'complex' | 'enterprise' = 'simple';
  if (nodes.length >= 15 || (aiNodes.length >= 2 && conditionNodes.length >= 2)) {
    complexity = 'enterprise';
  } else if (nodes.length >= 8 || aiNodes.length >= 2) {
    complexity = 'complex';
  } else if (nodes.length >= 4 || aiNodes.length >= 1) {
    complexity = 'moderate';
  }
  
  return {
    category,
    primaryAction,
    platforms: platforms.slice(0, 3), // Max 3 platforms
    workflowType,
    complexity,
    hasAI: aiNodes.length > 0,
    hasGuardrails: guardrailNodes.length > 0,
    nodeCount: nodes.length,
  };
}

/**
 * Generates a short hash from workflow content for uniqueness
 */
function generateShortHash(nodes: WorkflowNodeData[]): string {
  const content = nodes.map(n => `${n.id}${n.type}${n.title}`).join('');
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).slice(0, 6);
}

/**
 * Formats a date for filename use
 */
function formatTimestamp(format: 'full' | 'date' | 'compact' = 'compact'): string {
  const now = new Date();
  
  switch (format) {
    case 'full':
      return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    case 'date':
      return now.toISOString().slice(0, 10);
    case 'compact':
    default:
      return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  }
}

/**
 * Converts string to different case formats
 */
function formatCase(str: string, format: NamingContext['format'] = 'kebab'): string {
  const words = str.toLowerCase().split(/[-_\s]+/).filter(Boolean);
  
  switch (format) {
    case 'snake':
      return words.join('_');
    case 'camel':
      return words.map((w, i) => i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)).join('');
    case 'pascal':
      return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
    case 'kebab':
    default:
      return words.join('-');
  }
}

/**
 * Extracts meaningful keywords from text
 */
function extractKeywords(text: string, maxWords: number = 3): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'been', 'be',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'could', 'may', 'might', 'must', 'can', 'new', 'get', 'set', 'add',
    'when', 'then', 'if', 'else', 'this', 'that', 'these', 'those', 'my',
    'workflow', 'node', 'step', 'action', 'trigger', 'data', 'process'
  ]);
  
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, maxWords);
}

/**
 * Sanitizes a filename to be filesystem-safe
 */
function sanitizeFilename(name: string, maxLength: number = 80): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLength);
}

/**
 * Main function: Generates a smart workflow name
 */
export function generateSmartWorkflowName(
  nodes: WorkflowNodeData[],
  context: NamingContext = {}
): string {
  if (nodes.length === 0) {
    return 'empty-workflow';
  }
  
  const {
    workflowTitle,
    version,
    environment,
    exportPlatform,
    includeTimestamp = false,
    includeHash = false,
    format = 'kebab'
  } = context;
  
  const signature = analyzeWorkflowSignature(nodes);
  const nameParts: string[] = [];
  
  // 1. Add title keywords if provided
  if (workflowTitle) {
    const titleKeywords = extractKeywords(workflowTitle, 2);
    if (titleKeywords.length > 0) {
      nameParts.push(...titleKeywords);
    }
  }
  
  // 2. Add category if detected and not in title
  if (signature.category && !nameParts.some(p => signature.category?.includes(p))) {
    nameParts.push(signature.category);
  }
  
  // 3. Add primary action if detected
  if (signature.primaryAction && !nameParts.some(p => signature.primaryAction?.includes(p))) {
    // Prefix with 'ai' if it's an AI-enhanced action
    if (signature.hasAI && ['summarize', 'classify', 'generate', 'extract', 'respond'].includes(signature.primaryAction)) {
      nameParts.push(`ai-${signature.primaryAction}`);
    } else {
      nameParts.push(signature.primaryAction);
    }
  }
  
  // 4. Add platform if specific (max 2)
  if (signature.platforms.length > 0 && signature.platforms.length <= 2) {
    nameParts.push(...signature.platforms);
  } else if (signature.platforms.length > 2) {
    // Just add the first one with indicator
    nameParts.push(signature.platforms[0]);
    nameParts.push('plus');
  }
  
  // 5. Add workflow type for complex workflows
  if (signature.complexity !== 'simple' && !nameParts.includes(signature.workflowType)) {
    nameParts.push(signature.workflowType);
  }
  
  // 6. Add guardrail indicator if present
  if (signature.hasGuardrails) {
    nameParts.push('guarded');
  }
  
  // Fallback if nothing detected
  if (nameParts.length === 0) {
    const triggerNode = nodes.find(n => n.type === 'trigger');
    const keywords = extractKeywords(triggerNode?.title || nodes[0].title, 2);
    nameParts.push(...(keywords.length > 0 ? keywords : ['custom']));
    nameParts.push('workflow');
  }
  
  // Build base name
  let baseName = nameParts.join('-');
  
  // 7. Add environment prefix if specified
  if (environment && environment !== 'production') {
    baseName = `${environment}-${baseName}`;
  }
  
  // 8. Add platform suffix if exporting to specific platform
  if (exportPlatform) {
    baseName = `${baseName}-${exportPlatform}`;
  }
  
  // 9. Add version if specified
  if (version) {
    baseName = `${baseName}-v${version.replace(/[^0-9.]/g, '')}`;
  }
  
  // 10. Add timestamp if requested
  if (includeTimestamp) {
    baseName = `${baseName}-${formatTimestamp('compact')}`;
  }
  
  // 11. Add hash if requested for uniqueness
  if (includeHash) {
    baseName = `${baseName}-${generateShortHash(nodes)}`;
  }
  
  // Apply formatting and sanitization
  return sanitizeFilename(formatCase(baseName, format));
}

/**
 * Generates names for a complete export package
 */
export function generateExportPackageNames(
  nodes: WorkflowNodeData[],
  context: NamingContext = {}
): {
  packageName: string;
  workflowFile: string;
  documentationDir: string;
  configFile: string;
  testFile: string;
  readmeFile: string;
} {
  const baseName = generateSmartWorkflowName(nodes, { ...context, includeTimestamp: false });
  const timestamp = formatTimestamp('compact');
  
  return {
    packageName: `${baseName}-${timestamp}`,
    workflowFile: `${baseName}.json`,
    documentationDir: `${baseName}-docs`,
    configFile: `${baseName}.config`,
    testFile: `${baseName}.test`,
    readmeFile: 'README',
  };
}

/**
 * Generates a human-readable description of the workflow
 */
export function generateWorkflowDescription(nodes: WorkflowNodeData[]): string {
  const signature = analyzeWorkflowSignature(nodes);
  
  const parts: string[] = [];
  
  // Complexity descriptor
  const complexityMap = {
    simple: 'Simple',
    moderate: 'Standard',
    complex: 'Advanced',
    enterprise: 'Enterprise-grade',
  };
  parts.push(complexityMap[signature.complexity]);
  
  // AI descriptor
  if (signature.hasAI) {
    parts.push('AI-powered');
  }
  
  // Type descriptor
  if (signature.workflowType !== 'workflow') {
    const typeMap: Record<string, string> = {
      'multi-agent-pipeline': 'multi-agent pipeline',
      'ai-chain': 'AI chain',
      'ai-powered': 'intelligent workflow',
      'decision-tree': 'decision tree',
      'branching': 'branching workflow',
      'pipeline': 'automation pipeline',
      'automation': 'automation',
    };
    parts.push(typeMap[signature.workflowType] || signature.workflowType);
  } else {
    parts.push('workflow');
  }
  
  // Category context
  if (signature.category) {
    const categoryMap: Record<string, string> = {
      'lead-gen': 'for lead generation',
      'customer-success': 'for customer success',
      'invoicing': 'for invoicing',
      'ecommerce': 'for e-commerce',
      'support': 'for customer support',
      'hr-ops': 'for HR operations',
      'marketing': 'for marketing',
      'sales': 'for sales',
      'content': 'for content management',
      'analytics': 'for data analytics',
      'notifications': 'for notifications',
      'document': 'for document processing',
      'social': 'for social media',
      'scheduling': 'for scheduling',
      'compliance': 'for compliance',
    };
    parts.push(categoryMap[signature.category] || `for ${signature.category}`);
  }
  
  // Platform context
  if (signature.platforms.length > 0) {
    const platformList = signature.platforms.slice(0, 2).join(' and ');
    parts.push(`integrating with ${platformList}`);
  }
  
  // Guardrail mention
  if (signature.hasGuardrails) {
    parts.push('with safety guardrails');
  }
  
  return parts.join(' ');
}

// Re-export the legacy function for backward compatibility
export { generateSmartWorkflowName as generateWorkflowName };
