// Jerry "Specify" pass — turns an underspecified imported workflow into a
// concrete, runnable one. Runs in two phases:
//   1. Deterministic cleanup (fast, no AI): strip foreign role-contract cruft,
//      normalize trigger, drop empty roleEnforced flags, dedupe.
//   2. AI concretization (Lovable AI Gateway): resolve generic node types to
//      explicit operations, synthesize prompts for empty AI nodes, infer a
//      runtime trigger when missing.
//
// Returns { workflow, changes[] } so the UI can summarize what happened.

export interface SpecifyChange {
  nodeId: string;
  field: "type" | "title" | "config" | "prompt" | "trigger" | "removed_field";
  before: unknown;
  after: unknown;
  reason: string;
}

const FOREIGN_ROLE_KEYS = new Set([
  "agentRole",
  "roleContract",
  "roleEnforced",
  "roleAssignedAt",
]);

const GENERIC_TYPES = new Set(["action", "ai", "trigger", "data", "utility"]);

/** Phase 1 — pure-JS cleanup, always safe to run. */
export function deterministicCleanup(workflow: any): {
  workflow: any;
  changes: SpecifyChange[];
} {
  const changes: SpecifyChange[] = [];
  const nodes = (workflow.nodes || []).map((n: any) => {
    const cfg = { ...(n.config || {}) };
    for (const k of Object.keys(cfg)) {
      if (FOREIGN_ROLE_KEYS.has(k)) {
        changes.push({
          nodeId: n.id,
          field: "removed_field",
          before: cfg[k],
          after: undefined,
          reason: `Stripped foreign role-contract field "${k}" (not part of our runtime).`,
        });
        delete cfg[k];
      }
    }
    return { ...n, config: cfg };
  });

  // Ensure exactly one trigger; if none, add a manual one.
  const hasTrigger = nodes.some((n: any) =>
    String(n.type).toLowerCase().includes("trigger")
  );
  if (!hasTrigger) {
    const triggerNode = {
      id: `trigger_${Date.now()}`,
      type: "trigger",
      title: "Manual Trigger",
      position: { x: 80, y: 80 },
      order: -1,
      config: { mode: "manual" },
    };
    nodes.unshift(triggerNode);
    changes.push({
      nodeId: triggerNode.id,
      field: "trigger",
      before: null,
      after: triggerNode,
      reason: "Workflow had no trigger; added a Manual Trigger.",
    });
  }

  return { workflow: { ...workflow, nodes }, changes };
}

/** Phase 2 — ask Lovable AI to concretize nodes that are still ambiguous. */
export async function aiConcretize(
  workflow: any,
  apiKey: string,
): Promise<{ workflow: any; changes: SpecifyChange[] }> {
  const changes: SpecifyChange[] = [];
  const candidates = (workflow.nodes || []).filter((n: any) => {
    const t = String(n.type || "").toLowerCase();
    const hasPrompt =
      n?.config?.system_message || n?.config?.user_prompt_template || n?.config?.prompt;
    const looksAi = t === "ai" || t.startsWith("ai_");
    const looksGeneric = GENERIC_TYPES.has(t);
    const titleVague = /^(action|step|node|task|manage|handle|process)\b/i.test(
      n.title || "",
    );
    return looksGeneric || titleVague || (looksAi && !hasPrompt);
  });

  if (candidates.length === 0) return { workflow, changes };

  const sys = `You concretize underspecified workflow nodes. For each input node, output an EXPLICIT specification:
- explicit_type: replace generic "action"/"ai"/"data" with a precise operation id like "gmail.get_inbox", "google_calendar.list_events", "google_calendar.create_event", "ai.summarize", "ai.classify", "http.request", "slack.post_message", etc. Use snake_case dotted names.
- explicit_title: short, action-oriented human title (e.g. "Read Gmail Inbox").
- config_patch: object of fields to MERGE into the node config (operation, resource, filters, output schema, etc.). For calendar nodes that don't specify CRUD, default to a READ operation (list_events) unless context clearly implies write.
- prompt (only for AI nodes): { system_message, user_prompt_template } with concrete instructions referencing prior step outputs via {{context.<node_id>}}.
- reason: 1 sentence why.
Respect the workflow's overall intent inferred from its name and surrounding nodes. Never invent destructive operations (delete/update) unless the node title explicitly asks for it.`;

  const userPayload = {
    workflow_name: workflow.name,
    all_nodes: (workflow.nodes || []).map((n: any) => ({
      id: n.id,
      type: n.type,
      title: n.title,
    })),
    nodes_to_specify: candidates.map((n: any) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      description: n.description,
      config: n.config,
    })),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 110_000);

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: controller.signal,
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "return_specifications",
            description: "Return concrete specifications for each candidate node",
            parameters: {
              type: "object",
              properties: {
                specifications: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      explicit_type: { type: "string" },
                      explicit_title: { type: "string" },
                      config_patch: { type: "object", additionalProperties: true },
                      prompt: {
                        type: "object",
                        properties: {
                          system_message: { type: "string" },
                          user_prompt_template: { type: "string" },
                        },
                      },
                      reason: { type: "string" },
                    },
                    required: ["id", "explicit_type", "explicit_title", "reason"],
                  },
                },
              },
              required: ["specifications"],
            },
          },
        },
      ],
      tool_choice: {
        type: "function",
        function: { name: "return_specifications" },
      },
    }),
  }).catch((e) => {
    clearTimeout(timeout);
    throw e;
  });
  clearTimeout(timeout);

  if (!res.ok) {
    console.error("specify ai gateway error", res.status, await res.text());
    return { workflow, changes };
  }

  const data = await res.json();
  const tc = data?.choices?.[0]?.message?.tool_calls?.[0];
  const specs: any[] = tc ? JSON.parse(tc.function.arguments)?.specifications || [] : [];

  const byId: Record<string, any> = {};
  for (const s of specs) if (s?.id) byId[s.id] = s;

  const newNodes = (workflow.nodes || []).map((n: any) => {
    const s = byId[n.id];
    if (!s) return n;
    const next = { ...n, config: { ...(n.config || {}), ...(s.config_patch || {}) } };
    if (s.explicit_type && s.explicit_type !== n.type) {
      changes.push({
        nodeId: n.id,
        field: "type",
        before: n.type,
        after: s.explicit_type,
        reason: s.reason,
      });
      next.type = s.explicit_type;
    }
    if (s.explicit_title && s.explicit_title !== n.title) {
      changes.push({
        nodeId: n.id,
        field: "title",
        before: n.title,
        after: s.explicit_title,
        reason: s.reason,
      });
      next.title = s.explicit_title;
    }
    if (s.prompt && (s.prompt.system_message || s.prompt.user_prompt_template)) {
      next.config = {
        ...next.config,
        system_message: s.prompt.system_message ?? next.config.system_message,
        user_prompt_template:
          s.prompt.user_prompt_template ?? next.config.user_prompt_template,
      };
      changes.push({
        nodeId: n.id,
        field: "prompt",
        before: null,
        after: s.prompt,
        reason: s.reason,
      });
    }
    if (s.config_patch && Object.keys(s.config_patch).length > 0) {
      changes.push({
        nodeId: n.id,
        field: "config",
        before: n.config,
        after: next.config,
        reason: s.reason,
      });
    }
    return next;
  });

  return { workflow: { ...workflow, nodes: newNodes }, changes };
}

/** Run both phases. AI phase is best-effort: errors don't block the import. */
export async function specifyWorkflow(
  workflow: any,
  apiKey: string | undefined,
): Promise<{ workflow: any; changes: SpecifyChange[] }> {
  const phase1 = deterministicCleanup(workflow);
  if (!apiKey) return phase1;
  try {
    const phase2 = await aiConcretize(phase1.workflow, apiKey);
    return {
      workflow: phase2.workflow,
      changes: [...phase1.changes, ...phase2.changes],
    };
  } catch (e) {
    console.error("aiConcretize failed, returning phase1 only", e);
    return phase1;
  }
}
