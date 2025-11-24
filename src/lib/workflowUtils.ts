import { WorkflowNodeData } from "@/types/workflow";

/**
 * Generates a meaningful filename based on workflow node types and titles
 * @param nodes - The workflow nodes
 * @param workflowTitle - Optional explicit workflow title to incorporate
 */
export const generateWorkflowName = (nodes: WorkflowNodeData[], workflowTitle?: string): string => {
  if (nodes.length === 0) {
    return "empty-workflow";
  }

  // Extract all titles and descriptions for analysis
  const allText = nodes.map(n => `${n.title} ${n.description || ''}`).join(' ').toLowerCase();
  
  // If explicit workflow title provided, extract keywords from it
  const titleKeywords = workflowTitle ? extractKeyWords(workflowTitle) : [];
  
  // Detect workflow category/purpose
  const category = detectWorkflowCategory(allText, nodes);
  
  // Detect primary action/function
  const primaryAction = detectPrimaryAction(allText, nodes);
  
  // Detect tools/platforms involved
  const platforms = detectPlatforms(allText);
  
  // Build intelligent name
  let nameParts: string[] = [];
  
  // Add workflow title keywords first if provided (most important)
  if (titleKeywords.length > 0) {
    nameParts.push(...titleKeywords.slice(0, 2)); // Use first 2 keywords from title
  }
  
  // Add category if detected
  if (category) {
    nameParts.push(category);
  }
  
  // Add primary action
  if (primaryAction) {
    nameParts.push(primaryAction);
  }
  
  // Add platform if relevant and specific
  if (platforms.length > 0 && platforms.length <= 2) {
    nameParts.push(...platforms);
  }
  
  // Add workflow type based on complexity
  const workflowType = detectWorkflowType(nodes);
  if (workflowType) {
    nameParts.push(workflowType);
  }
  
  // Fallback to simple name if nothing detected
  if (nameParts.length === 0) {
    const triggerNode = nodes.find(n => n.type === "trigger");
    const keyWords = extractKeyWords(triggerNode?.title || nodes[0].title);
    nameParts = keyWords.slice(0, 2);
    nameParts.push("workflow");
  }
  
  return sanitizeFilename(nameParts.join("-"));
};

/**
 * Detects the workflow category/domain
 */
const detectWorkflowCategory = (text: string, nodes: WorkflowNodeData[]): string | null => {
  const categories = {
    'lead': ['lead', 'prospect', 'inquiry', 'contact form', 'signup'],
    'customer': ['customer', 'client', 'user onboard'],
    'invoice': ['invoice', 'billing', 'payment', 'receipt'],
    'order': ['order', 'purchase', 'checkout', 'cart'],
    'support': ['support', 'ticket', 'help desk', 'issue'],
    'hr': ['employee', 'hiring', 'recruitment', 'onboarding', 'hr'],
    'marketing': ['campaign', 'newsletter', 'marketing', 'promotion'],
    'sales': ['sales', 'deal', 'opportunity', 'quote'],
    'content': ['content', 'blog', 'article', 'post', 'publish'],
    'data': ['data', 'report', 'analytics', 'sync', 'export'],
    'notification': ['notification', 'alert', 'reminder', 'notify'],
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(kw => text.includes(kw))) {
      return category;
    }
  }
  
  return null;
};

/**
 * Detects the primary action/function
 */
const detectPrimaryAction = (text: string, nodes: WorkflowNodeData[]): string | null => {
  const actions = {
    'intake': ['intake', 'receive', 'capture', 'collect'],
    'processing': ['process', 'transform', 'parse', 'analyze'],
    'summarization': ['summarize', 'summary', 'digest'],
    'classification': ['classify', 'categorize', 'sort', 'tag'],
    'enrichment': ['enrich', 'enhance', 'augment'],
    'notification': ['notify', 'alert', 'send email', 'send message'],
    'automation': ['automate', 'schedule', 'trigger'],
    'routing': ['route', 'distribute', 'assign'],
    'approval': ['approve', 'review', 'validate'],
    'generation': ['generate', 'create', 'build'],
  };
  
  const hasAI = nodes.some(n => n.type === 'ai');
  
  for (const [action, keywords] of Object.entries(actions)) {
    if (keywords.some(kw => text.includes(kw))) {
      // Add "ai" prefix if AI is involved in this action
      return hasAI && ['summarization', 'classification', 'generation'].includes(action) 
        ? `ai-${action}` 
        : action;
    }
  }
  
  return null;
};

/**
 * Detects platforms/tools mentioned
 */
const detectPlatforms = (text: string): string[] => {
  const platforms = [
    'email', 'gmail', 'slack', 'discord', 'telegram',
    'stripe', 'paypal', 'calendar', 'sheets', 'airtable',
    'hubspot', 'salesforce', 'notion', 'jira', 'trello',
    'shopify', 'wordpress', 'github', 'twitter', 'linkedin'
  ];
  
  return platforms.filter(p => text.includes(p));
};

/**
 * Detects workflow type based on structure
 */
const detectWorkflowType = (nodes: WorkflowNodeData[]): string | null => {
  const aiNodes = nodes.filter(n => n.type === 'ai');
  const actionNodes = nodes.filter(n => n.type === 'action');
  const conditionNodes = nodes.filter(n => n.type === 'condition');
  
  // Already has AI in the name from primary action? Skip
  const hasAIInActions = nodes.some(n => 
    n.title.toLowerCase().includes('ai') || 
    n.description?.toLowerCase().includes('ai')
  );
  
  if (aiNodes.length >= 2) {
    return 'multi-agent';
  } else if (aiNodes.length === 1 && !hasAIInActions) {
    return 'ai-powered';
  } else if (conditionNodes.length >= 2) {
    return 'branching';
  } else if (actionNodes.length >= 4) {
    return 'automation';
  } else if (nodes.length <= 3) {
    return 'simple';
  }
  
  return 'workflow';
};

/**
 * Extracts meaningful keywords from a node title
 */
const extractKeyWords = (title: string): string[] => {
  // Common words to exclude
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "been", "be",
    "have", "has", "had", "do", "does", "did", "will", "would", "should",
    "could", "may", "might", "must", "can", "new", "get", "set", "add"
  ]);
  
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special chars
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 3); // Max 3 words
};

/**
 * Sanitizes a filename to be filesystem-safe
 */
const sanitizeFilename = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Remove duplicate hyphens
    .replace(/^-|-$/g, "") // Remove leading/trailing hyphens
    .slice(0, 50); // Limit length
};
