import type { WorkflowNodeData } from "@/types/workflow";

export interface WorkflowConnection {
  from: string;
  to: string;
  type?: string;
  condition?: string;
  label?: string;
  sourceOutput?: number | string;
  targetInput?: number | string;
}

const asId = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const id = String(value).trim();
  return id.length > 0 ? id : null;
};

const buildNodeLookup = (nodes: WorkflowNodeData[]) => {
  const lookup = new Map<string, string>();
  nodes.forEach((node) => {
    const id = String(node.id);
    lookup.set(id, id);
    lookup.set(node.title, id);
    lookup.set(node.title.toLowerCase(), id);
    lookup.set((node as any).name ?? "", id);
    lookup.set(String((node as any).name ?? "").toLowerCase(), id);
  });
  lookup.delete("");
  return lookup;
};

export const inferSequentialConnections = (nodes: WorkflowNodeData[]): WorkflowConnection[] =>
  nodes.slice(0, -1).map((node, index) => ({
    from: String(node.id),
    to: String(nodes[index + 1].id),
    type: "data_flow",
  }));

export function normalizeWorkflowConnections(
  rawConnections: unknown,
  nodes: WorkflowNodeData[]
): WorkflowConnection[] {
  if (nodes.length < 2) return [];

  const nodeIds = new Set(nodes.map((node) => String(node.id)));
  const lookup = buildNodeLookup(nodes);
  const connections: WorkflowConnection[] = [];
  const seen = new Set<string>();

  const resolveNodeId = (value: unknown): string | null => {
    const id = asId(value);
    if (!id) return null;
    return lookup.get(id) ?? lookup.get(id.toLowerCase()) ?? (nodeIds.has(id) ? id : null);
  };

  const add = (fromValue: unknown, toValue: unknown, extra: Partial<WorkflowConnection> = {}) => {
    const from = resolveNodeId(fromValue);
    const to = resolveNodeId(toValue);
    if (!from || !to || from === to) return;
    const key = `${from}->${to}->${extra.sourceOutput ?? 0}->${extra.targetInput ?? 0}->${extra.label ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    connections.push({ from, to, type: extra.type ?? "data_flow", ...extra });
  };

  if (Array.isArray(rawConnections)) {
    rawConnections.forEach((connection: any) => {
      add(
        connection?.from ?? connection?.source ?? connection?.sourceId ?? connection?.source_node_id,
        connection?.to ?? connection?.target ?? connection?.targetId ?? connection?.target_node_id,
        {
          type: connection?.type,
          condition: connection?.condition,
          label: connection?.label,
          sourceOutput: connection?.sourceOutput ?? connection?.source_output ?? connection?.outputIndex,
          targetInput: connection?.targetInput ?? connection?.target_input ?? connection?.inputIndex,
        }
      );
    });
  } else if (rawConnections && typeof rawConnections === "object") {
    // n8n shape: { "Source Node Name": { main: [[{ node: "Target Node Name", type: "main", index: 0 }]] } }
    Object.entries(rawConnections as Record<string, any>).forEach(([sourceName, outputGroups]) => {
      const mainOutputs = outputGroups?.main ?? outputGroups;
      if (!Array.isArray(mainOutputs)) return;
      mainOutputs.forEach((group: any, outputIndex: number) => {
        const targets = Array.isArray(group) ? group : [group];
        targets.forEach((target: any) => {
          add(sourceName, target?.node ?? target?.to ?? target?.target, {
            type: target?.type ?? "data_flow",
            sourceOutput: outputIndex,
            targetInput: target?.index ?? 0,
          });
        });
      });
    });
  }

  nodes.forEach((node) => {
    const next = (node as any).next ?? node.config?.next ?? node.config?.nextNodeId;
    if (Array.isArray(next)) next.forEach((target) => add(node.id, target));
    else if (next) add(node.id, next);
  });

  return connections.length > 0 ? connections : inferSequentialConnections(nodes);
}

export function createUniqueNodeNames(nodes: WorkflowNodeData[]): Record<string, string> {
  const counts = new Map<string, number>();
  const names: Record<string, string> = {};

  nodes.forEach((node, index) => {
    const base = (node.title || `Step ${index + 1}`).trim().replace(/\s+/g, " ") || `Step ${index + 1}`;
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    names[String(node.id)] = count === 0 ? base : `${base} ${count + 1}`;
  });

  return names;
}

export function buildN8NConnections(
  nodes: WorkflowNodeData[],
  rawConnections?: unknown,
  nodeNames: Record<string, string> = createUniqueNodeNames(nodes)
): Record<string, { main: Array<Array<{ node: string; type: "main"; index: number }>> }> {
  const connections = normalizeWorkflowConnections(rawConnections, nodes);
  const output: Record<string, { main: Array<Array<{ node: string; type: "main"; index: number }>> }> = {};

  connections.forEach((connection) => {
    const sourceName = nodeNames[String(connection.from)];
    const targetName = nodeNames[String(connection.to)];
    if (!sourceName || !targetName) return;
    const outputIndex = Number(connection.sourceOutput ?? 0) || 0;
    output[sourceName] ??= { main: [] };
    output[sourceName].main[outputIndex] ??= [];
    output[sourceName].main[outputIndex].push({
      node: targetName,
      type: "main",
      index: Number(connection.targetInput ?? 0) || 0,
    });
  });

  return output;
}

export function validateN8NWorkflow(workflow: any): { valid: boolean; reason?: string } {
  if (!workflow || !Array.isArray(workflow.nodes)) return { valid: false, reason: "Missing nodes array" };
  if (!workflow.connections || typeof workflow.connections !== "object" || Array.isArray(workflow.connections)) {
    return { valid: false, reason: "Missing connections object" };
  }

  const nodeNames = new Set<string>();
  for (const node of workflow.nodes) {
    if (!node?.name || !node?.type || !Array.isArray(node?.position)) {
      return { valid: false, reason: "Every node needs a name, type, and position" };
    }
    if (nodeNames.has(node.name)) return { valid: false, reason: `Duplicate node name: ${node.name}` };
    nodeNames.add(node.name);
  }

  for (const [sourceName, groups] of Object.entries(workflow.connections)) {
    if (!nodeNames.has(sourceName)) return { valid: false, reason: `Connection source not found: ${sourceName}` };
    const main = (groups as any)?.main;
    if (!Array.isArray(main)) return { valid: false, reason: `Connection source has no main output: ${sourceName}` };
    for (const targets of main) {
      if (!Array.isArray(targets)) return { valid: false, reason: `Invalid output list for ${sourceName}` };
      for (const target of targets) {
        if (!nodeNames.has(target?.node)) return { valid: false, reason: `Connection target not found: ${target?.node}` };
      }
    }
  }

  return { valid: true };
}