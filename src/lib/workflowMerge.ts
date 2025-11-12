import { WorkflowNodeData } from "@/components/WorkflowNode";

interface WorkflowToMerge {
  name: string;
  nodes: WorkflowNodeData[];
  connections: Array<{ from: string; to: string }>;
  phase?: string;
  contextTags?: string[];
}

export const mergeWorkflows = (workflows: WorkflowToMerge[]): { nodes: WorkflowNodeData[]; connections: any[] } => {
  if (workflows.length === 0) return { nodes: [], connections: [] };
  if (workflows.length === 1) return { nodes: workflows[0].nodes, connections: workflows[0].connections };

  // Sort workflows by phase
  const phaseOrder = { initial: 0, intermediate: 1, final: 2, standalone: 3 };
  const sortedWorkflows = [...workflows].sort((a, b) => {
    const aPhase = phaseOrder[a.phase as keyof typeof phaseOrder] ?? 999;
    const bPhase = phaseOrder[b.phase as keyof typeof phaseOrder] ?? 999;
    return aPhase - bPhase;
  });

  const mergedNodes: WorkflowNodeData[] = [];
  const mergedConnections: any[] = [];
  const idMapping = new Map<string, string>();
  let xOffset = 100;
  const ySpacing = 150;

  sortedWorkflows.forEach((workflow, workflowIndex) => {
    // Add workflow nodes with offset
    workflow.nodes.forEach((node, nodeIndex) => {
      const newId = `${workflow.name.toLowerCase().replace(/\s+/g, '_')}_${node.id}`;
      idMapping.set(node.id, newId);

      mergedNodes.push({
        ...node,
        id: newId,
        x: xOffset,
        y: 100 + (nodeIndex * ySpacing),
        title: `[${workflow.name}] ${node.title}`,
      });
    });

    // Add workflow connections with updated IDs
    workflow.connections?.forEach(conn => {
      const fromId = idMapping.get(conn.from);
      const toId = idMapping.get(conn.to);
      if (fromId && toId) {
        mergedConnections.push({ from: fromId, to: toId });
      }
    });

    // Create handoff connection to next workflow
    if (workflowIndex < sortedWorkflows.length - 1) {
      const lastNodeOfCurrent = workflow.nodes[workflow.nodes.length - 1];
      const firstNodeOfNext = sortedWorkflows[workflowIndex + 1].nodes[0];
      
      const currentLastId = idMapping.get(lastNodeOfCurrent.id);
      const nextFirstId = `${sortedWorkflows[workflowIndex + 1].name.toLowerCase().replace(/\s+/g, '_')}_${firstNodeOfNext.id}`;
      
      if (currentLastId && nextFirstId) {
        // Add handoff node
        const handoffNodeId = `handoff_${workflowIndex}`;
        mergedNodes.push({
          id: handoffNodeId,
          type: 'agent_handoff',
          title: `Handoff: ${workflow.name} → ${sortedWorkflows[workflowIndex + 1].name}`,
          description: `Transfer execution context between workflow phases`,
          x: xOffset + 400,
          y: 100 + ((workflow.nodes.length * ySpacing) / 2),
          config: {
            from_workflow: workflow.name,
            to_workflow: sortedWorkflows[workflowIndex + 1].name,
            context_carryover: true,
          },
        });

        mergedConnections.push(
          { from: currentLastId, to: handoffNodeId },
          { from: handoffNodeId, to: nextFirstId }
        );
      }
    }

    xOffset += 800; // Move right for next workflow
  });

  return { nodes: mergedNodes, connections: mergedConnections };
};

export const exportFlowBundle = (workflows: any[], bundleName: string): void => {
  const bundle = {
    version: "1.0.0",
    bundleName,
    createdAt: new Date().toISOString(),
    workflows: workflows.map(wf => ({
      name: wf.name,
      contextTags: wf.contextTags || [],
      phase: wf.phase || "standalone",
      estimatedComplexity: wf.estimatedComplexity || "medium",
      nodes: wf.nodes || [],
      connections: wf.connections || [],
      executionStrategy: wf.execution_strategy || wf.executionStrategy || {},
      explanation: wf.explanation || "",
      guardrailExplanations: wf.guardrailExplanations || [],
      complianceStandards: wf.complianceStandards || [],
      riskScore: wf.riskScore || 0,
    })),
    metadata: {
      totalNodes: workflows.reduce((sum, wf) => sum + (wf.nodes?.length || 0), 0),
      totalWorkflows: workflows.length,
      canMerge: workflows.length > 1,
    }
  };

  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${bundleName.toLowerCase().replace(/\s+/g, '-')}.flowbundle.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
