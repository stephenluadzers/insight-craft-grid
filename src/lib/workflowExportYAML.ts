/**
 * YAML Export for Remora Flow
 * Exports workflows to human-readable YAML format
 */

import { WorkflowConnectionData, WorkflowNodeData } from "@/types/workflow";
import { downloadBlob, openDownloadWindow } from "./downloadFile";
import { normalizeWorkflowConnections } from "./workflowConnections";

const yamlString = (value: unknown): string => JSON.stringify(String(value ?? ""));

export function exportWorkflowToYAML(nodes: WorkflowNodeData[], workflowName: string, connections?: WorkflowConnectionData[]): string {
  const normalizedConnections = normalizeWorkflowConnections(connections, nodes);
  const yaml = `# Remora Flow Workflow Export
# Generated: ${new Date().toISOString()}
# Workflow: ${workflowName}

name: ${yamlString(workflowName)}
version: "1.0"
description: ${yamlString(`${workflowName} workflow with ${nodes.length} nodes`)}

# Complete workflow architecture with decision trees and branches
nodes:
${nodes.map((node, index) => `  - id: ${node.id}
    type: ${node.type}
     title: ${yamlString(node.title)}
     description: ${yamlString(node.description)}
    position:
      x: ${node.x}
      y: ${node.y}
    config:
${Object.entries(node.config || {}).map(([key, value]) => `      ${key}: ${JSON.stringify(value)}`).join('\n')}
`).join('\n')}

connections:
${normalizedConnections.length > 0 ? normalizedConnections.map((connection) => `  - from: ${connection.from}
    to: ${connection.to}
    type: ${yamlString(connection.type || 'data_flow')}${connection.label ? `\n    label: ${yamlString(connection.label)}` : ''}${connection.condition ? `\n    condition: ${yamlString(connection.condition)}` : ''}${connection.sourceOutput !== undefined ? `\n    sourceOutput: ${JSON.stringify(connection.sourceOutput)}` : ''}${connection.targetInput !== undefined ? `\n    targetInput: ${JSON.stringify(connection.targetInput)}` : ''}`).join('\n') : '  []'}

# Export metadata
metadata:
  total_nodes: ${nodes.length}
  total_connections: ${normalizedConnections.length}
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
