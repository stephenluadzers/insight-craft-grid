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

const nodeTitle = (node: any, index: number): string =>
  String(node?.title ?? node?.name ?? `Step ${index + 1}`).trim();

const buildLookup = (nodes: any[]) => {
  const lookup = new Map<string, string>();
  nodes.forEach((node, index) => {
    const id = asId(node?.id) ?? `node-${index + 1}`;
    lookup.set(id, id);
    lookup.set(id.toLowerCase(), id);
    const title = nodeTitle(node, index);
    lookup.set(title, id);
    lookup.set(title.toLowerCase(), id);
    if (node?.name) {
      lookup.set(String(node.name), id);
      lookup.set(String(node.name).toLowerCase(), id);
    }
  });
  return lookup;
};

const resolveNodeId = (lookup: Map<string, string>, value: unknown): string | null => {
  const id = asId(value);
  if (!id) return null;
  return lookup.get(id) ?? lookup.get(id.toLowerCase()) ?? null;
};

const visualOrder = (nodes: any[]): string[] =>
  nodes
    .map((node, index) => ({
      id: asId(node?.id) ?? `node-${index + 1}`,
      x: Number.isFinite(Number(node?.x)) ? Number(node.x) : 300 + index * 260,
      y: Number.isFinite(Number(node?.y)) ? Number(node.y) : 120 + index * 180,
      index,
    }))
    .sort((a, b) => (a.x - b.x) || (a.y - b.y) || (a.index - b.index))
    .map((item) => item.id);

const edgeKey = (connection: WorkflowConnection) =>
  `${connection.from}->${connection.to}->${connection.sourceOutput ?? 0}->${connection.targetInput ?? 0}->${connection.label ?? ""}`;

export function normalizeWorkflowConnections(rawConnections: unknown, nodes: any[]): WorkflowConnection[] {
  if (!Array.isArray(nodes) || nodes.length < 2) return [];

  const lookup = buildLookup(nodes);
  const connections: WorkflowConnection[] = [];
  const seen = new Set<string>();

  const add = (fromValue: unknown, toValue: unknown, extra: Partial<WorkflowConnection> = {}) => {
    const from = resolveNodeId(lookup, fromValue);
    const to = resolveNodeId(lookup, toValue);
    if (!from || !to || from === to) return;
    const connection: WorkflowConnection = { from, to, type: extra.type ?? "data_flow", ...extra };
    const key = edgeKey(connection);
    if (seen.has(key)) return;
    seen.add(key);
    connections.push(connection);
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
        },
      );
    });
  } else if (rawConnections && typeof rawConnections === "object") {
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

  nodes.forEach((node: any) => {
    const next = node?.next ?? node?.config?.next ?? node?.config?.nextNodeId;
    if (Array.isArray(next)) next.forEach((target) => add(node.id, target));
    else if (next) add(node.id, next);
  });

  return connections.length > 0 ? connections : inferSequentialConnections(nodes);
}

export function inferSequentialConnections(nodes: any[]): WorkflowConnection[] {
  const ordered = visualOrder(nodes);
  return ordered.slice(0, -1).map((from, index) => ({
    from,
    to: ordered[index + 1],
    type: "data_flow",
  }));
}

export function finalizeWorkflowConnections(nodes: any[], rawConnections: unknown): WorkflowConnection[] {
  if (!Array.isArray(nodes) || nodes.length < 2) return [];

  let connections = normalizeWorkflowConnections(rawConnections, nodes);
  const nodeIds = new Set(nodes.map((node, index) => asId(node?.id) ?? `node-${index + 1}`));
  connections = connections.filter((connection) => nodeIds.has(connection.from) && nodeIds.has(connection.to));

  const connectedIds = new Set<string>();
  connections.forEach((connection) => {
    connectedIds.add(connection.from);
    connectedIds.add(connection.to);
  });

  const ordered = visualOrder(nodes);
  const existing = new Set(connections.map(edgeKey));

  const add = (connection: WorkflowConnection) => {
    if (connection.from === connection.to) return;
    const key = edgeKey(connection);
    if (existing.has(key)) return;
    existing.add(key);
    connections.push(connection);
  };

  const removeDirect = (from: string, to: string) => {
    connections = connections.filter((connection) => !(connection.from === from && connection.to === to));
    existing.clear();
    connections.forEach((connection) => existing.add(edgeKey(connection)));
  };

  for (const id of ordered) {
    if (connectedIds.has(id)) continue;
    const index = ordered.indexOf(id);
    const previous = [...ordered.slice(0, index)].reverse().find((candidate) => candidate !== id);
    const next = ordered.slice(index + 1).find((candidate) => candidate !== id);

    if (previous && next && connections.some((connection) => connection.from === previous && connection.to === next)) {
      removeDirect(previous, next);
      add({ from: previous, to: id, type: "data_flow" });
      add({ from: id, to: next, type: "data_flow" });
    } else {
      if (previous) add({ from: previous, to: id, type: "data_flow" });
      if (next) add({ from: id, to: next, type: "data_flow" });
    }

    connectedIds.add(id);
  }

  return connections.length > 0 ? connections : inferSequentialConnections(nodes);
}
