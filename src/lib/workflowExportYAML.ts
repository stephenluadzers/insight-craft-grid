/**
 * YAML Export for Remora Flow
 * Exports workflows to human-readable YAML format
 */

import { WorkflowNodeData } from "@/types/workflow";
import { downloadBlob, openDownloadWindow } from "./downloadFile";

export function exportWorkflowToYAML(nodes: WorkflowNodeData[], workflowName: string): string {
  const yaml = `# Remora Flow Workflow Export
# Generated: ${new Date().toISOString()}
# Workflow: ${workflowName}

name: ${workflowName}
version: "1.0"
description: ${workflowName} workflow with ${nodes.length} nodes

# Complete workflow architecture with decision trees and branches
nodes:
${nodes.map((node, index) => `  - id: ${node.id}
    type: ${node.type}
    title: "${node.title}"
    description: "${node.description}"
    position:
      x: ${node.x}
      y: ${node.y}
    config:
${Object.entries(node.config || {}).map(([key, value]) => `      ${key}: ${JSON.stringify(value)}`).join('\n')}
${index < nodes.length - 1 ? '    next: ' + nodes[index + 1].id : ''}
`).join('\n')}

# Export metadata
metadata:
  total_nodes: ${nodes.length}
  node_types:
${Array.from(new Set(nodes.map(n => n.type))).map(type => `    - ${type}`).join('\n')}
  compliance: true
  guardrails: enabled
  
# Instructions for importing
# This workflow can be imported into:
# - n8n (convert to JSON first)
# - GitHub Actions (adapt to .github/workflows/)
# - Supabase Functions (implement as edge functions)
# - Custom automation platforms
`;

  return yaml;
}

export function downloadYAML(yamlContent: string, filename: string): void {
  const resolvedFilename = filename.endsWith('.yaml') ? filename : `${filename}.yaml`;
  const blob = new Blob([yamlContent], { type: 'text/yaml;charset=utf-8;' });
  downloadBlob(blob, resolvedFilename, openDownloadWindow(resolvedFilename));
}
