import { WorkflowNodeData } from "@/components/WorkflowNode";

/**
 * Generates a meaningful filename based on workflow node types and titles
 */
export const generateWorkflowName = (nodes: WorkflowNodeData[]): string => {
  if (nodes.length === 0) {
    return "empty-workflow";
  }

  // Extract node types and titles
  const nodeTypes = nodes.map(n => n.type);
  const triggerNodes = nodes.filter(n => n.type === "trigger");
  const actionNodes = nodes.filter(n => n.type === "action");
  const aiNodes = nodes.filter(n => n.type === "ai");
  
  // Get key words from first trigger or first node
  const primaryNode = triggerNodes[0] || nodes[0];
  const keyWords = extractKeyWords(primaryNode.title);
  
  // Build descriptive name
  let name = "";
  
  if (keyWords.length > 0) {
    // Use first 2-3 key words from trigger/primary node
    name = keyWords.slice(0, 2).join("-");
  }
  
  // Add workflow type indicator
  if (aiNodes.length > 0) {
    name += name ? "-ai-workflow" : "ai-workflow";
  } else if (actionNodes.length > 1) {
    name += name ? "-automation" : "automation-workflow";
  } else {
    name += name ? "-workflow" : "workflow";
  }
  
  return sanitizeFilename(name);
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
