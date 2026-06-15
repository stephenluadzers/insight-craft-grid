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
  field: "type" | "title" | "config" | "prompt" | "trigger" | "removed_field" | "placeholder" | "auto_resolved";
  before: unknown;
  after: unknown;
  reason: string;
}

export interface AutoResolution {
  nodeId: string;
  nodeTitle: string;
  field: string;
  secretName: string;
  service: string;
}

export interface PlaceholderFlag {
  nodeId: string;
  nodeTitle: string;
  field: string;
  kind: "credential" | "template_id" | "bucket" | "url" | "value";
  currentValue: unknown;
  hint: string;
}

const PLACEHOLDER_VALUE_RE =
  /^(=|=\s*$|enter[\s_-]?\w+|your[\s_-]?\w+|<.*>|xxx+|todo|tbd|placeholder|change[\s_-]?me|api[\s_-]?key|secret|token)$/i;

const CREDENTIAL_HINTS: Array<{ match: RegExp; service: string }> = [
  { match: /leonardo|leo\b/i, service: "Leonardo AI" },
  { match: /runway/i, service: "Runway" },
  { match: /creatomate/i, service: "Creatomate" },
  { match: /minio|s3\b/i, service: "MinIO / S3" },
  { match: /openai|chatgpt/i, service: "OpenAI" },
  { match: /anthropic|claude/i, service: "Anthropic" },
  { match: /gemini|google.?ai/i, service: "Google AI" },
  { match: /slack/i, service: "Slack" },
  { match: /notion/i, service: "Notion" },
  { match: /airtable/i, service: "Airtable" },
];

function looksLikePlaceholder(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v !== "string") return false;
  const s = v.trim();
  if (s.length === 0) return true;
  return PLACEHOLDER_VALUE_RE.test(s);
}

/** Walk a node and return every placeholder we'd want a human to fill in. */
export function detectPlaceholders(node: any): PlaceholderFlag[] {
  const flags: PlaceholderFlag[] = [];
  const cfg = node?.config || {};
  const title: string = node?.title || node?.type || "Untitled node";

  const creds = cfg.credentials || node?.credentials;
  if (creds && typeof creds === "object") {
    for (const [credName, credVal] of Object.entries(creds)) {
      const id = (credVal as any)?.id ?? credVal;
      if (looksLikePlaceholder(id)) {
        const svc = CREDENTIAL_HINTS.find((h) => h.match.test(credName) || h.match.test(title));
        flags.push({
          nodeId: node.id,
          nodeTitle: title,
          field: `credentials.${credName}`,
          kind: "credential",
          currentValue: id,
          hint: `Provide ${svc?.service ?? credName} credentials.`,
        });
      }
    }
  } else {
    const svc = CREDENTIAL_HINTS.find((h) => h.match.test(title));
    const authish = cfg.authentication || cfg.authType || cfg.genericAuthType;
    if (svc && (authish || /api|http/i.test(node?.type || ""))) {
      flags.push({
        nodeId: node.id,
        nodeTitle: title,
        field: "credentials",
        kind: "credential",
        currentValue: null,
        hint: `Attach ${svc.service} credentials (auth token / API key).`,
      });
    }
  }

  const FIELD_HINTS: Record<string, { kind: PlaceholderFlag["kind"]; hint: string }> = {
    templateId: { kind: "template_id", hint: "Set the template ID (e.g. Creatomate template UUID)." },
    template_id: { kind: "template_id", hint: "Set the template ID." },
    bucketName: { kind: "bucket", hint: "Set the destination bucket name." },
    bucket: { kind: "bucket", hint: "Set the destination bucket name." },
    url: { kind: "url", hint: "Set the request URL." },
    endpoint: { kind: "url", hint: "Set the endpoint URL." },
    webhookUrl: { kind: "url", hint: "Set the webhook URL." },
    apiKey: { kind: "credential", hint: "Provide the API key." },
    token: { kind: "credential", hint: "Provide the auth token." },
  };

  for (const [key, meta] of Object.entries(FIELD_HINTS)) {
    if (key in cfg && looksLikePlaceholder(cfg[key])) {
      flags.push({
        nodeId: node.id,
        nodeTitle: title,
        field: `config.${key}`,
        kind: meta.kind,
        currentValue: cfg[key],
        hint: meta.hint,
      });
    }
  }

  return flags;
}

/** Scan all nodes and return both the flag list and an annotated workflow
 *  (each flagged node gets `config._placeholders: PlaceholderFlag[]` so the
 *  canvas can render a warning badge without extra plumbing). */
export function annotatePlaceholders(workflow: any): {
  workflow: any;
  flags: PlaceholderFlag[];
} {
  const allFlags: PlaceholderFlag[] = [];
  const nodes = (workflow.nodes || []).map((n: any) => {
    const f = detectPlaceholders(n);
    if (f.length === 0) return n;
    allFlags.push(...f);
    return { ...n, config: { ...(n.config || {}), _placeholders: f } };
  });
  return { workflow: { ...workflow, nodes, placeholders: allFlags }, flags: allFlags };
}

// Per-service candidate env var names that, if present in the edge runtime,
// allow Jerry to wire credentials autonomously without bugging the user.
const SERVICE_ENV_CANDIDATES: Record<string, string[]> = {
  "Leonardo AI": ["LEONARDO_API_KEY", "LEONARDO_AUTH_TOKEN", "LEONARDO_TOKEN"],
  "Runway": ["RUNWAY_API_KEY", "RUNWAY_AUTH_TOKEN", "RUNWAYML_API_KEY"],
  "Creatomate": ["CREATOMATE_API_KEY", "CREATOMATE_TOKEN"],
  "MinIO / S3": ["MINIO_ACCESS_KEY", "MINIO_SECRET_KEY", "S3_ACCESS_KEY_ID", "AWS_ACCESS_KEY_ID"],
  "OpenAI": ["OPENAI_API_KEY"],
  "Anthropic": ["ANTHROPIC_API_KEY"],
  "Google AI": ["GOOGLE_AI_API_KEY", "GEMINI_API_KEY"],
  "Slack": ["SLACK_BOT_TOKEN", "SLACK_TOKEN"],
  "Notion": ["NOTION_API_KEY", "NOTION_TOKEN"],
  "Airtable": ["AIRTABLE_API_KEY", "AIRTABLE_TOKEN"],
};

// Bucket / template-id env candidates by field key.
const FIELD_ENV_CANDIDATES: Record<string, string[]> = {
  bucket: ["MINIO_BUCKET", "S3_BUCKET", "DEFAULT_BUCKET"],
  bucketName: ["MINIO_BUCKET", "S3_BUCKET", "DEFAULT_BUCKET"],
  templateId: ["CREATOMATE_TEMPLATE_ID", "DEFAULT_TEMPLATE_ID"],
  template_id: ["CREATOMATE_TEMPLATE_ID", "DEFAULT_TEMPLATE_ID"],
};

function pickAvailableEnv(candidates: string[]): string | null {
  for (const name of candidates) {
    try {
      const v = Deno.env.get(name);
      if (v && v.trim().length > 0) return name;
    } catch { /* env unavailable */ }
  }
  return null;
}

function setByPath(obj: any, path: string, value: unknown) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (cur[k] == null || typeof cur[k] !== "object") cur[k] = {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
}

/** For each placeholder flag, check if a matching env var (project secret) is
 *  already configured. If so, rewrite the node config to reference it via
 *  `{{secrets.NAME}}` and drop the flag. Returns the resolved + remaining
 *  flags so the caller can report exactly what Jerry did autonomously. */
export function autoResolvePlaceholders(
  workflow: any,
  flags: PlaceholderFlag[],
): { workflow: any; resolved: AutoResolution[]; remaining: PlaceholderFlag[] } {
  const resolved: AutoResolution[] = [];
  const remaining: PlaceholderFlag[] = [];
  const nodes = [...(workflow.nodes || [])];
  const indexById: Record<string, number> = {};
  nodes.forEach((n, i) => { indexById[n.id] = i; });

  for (const f of flags) {
    let secretName: string | null = null;
    let service = "";

    if (f.kind === "credential") {
      const hint = CREDENTIAL_HINTS.find(
        (h) => h.match.test(f.nodeTitle) || h.match.test(f.field),
      );
      service = hint?.service ?? "";
      if (service && SERVICE_ENV_CANDIDATES[service]) {
        secretName = pickAvailableEnv(SERVICE_ENV_CANDIDATES[service]);
      }
    } else if (f.kind === "bucket" || f.kind === "template_id") {
      const fieldKey = f.field.replace(/^config\./, "");
      const cands = FIELD_ENV_CANDIDATES[fieldKey];
      if (cands) secretName = pickAvailableEnv(cands);
      service = f.kind === "bucket" ? "Storage bucket" : "Template ID";
    }

    if (!secretName) { remaining.push(f); continue; }

    const idx = indexById[f.nodeId];
    if (idx == null) { remaining.push(f); continue; }
    const node = { ...nodes[idx], config: { ...(nodes[idx].config || {}) } };
    // strip the existing placeholder annotation for this field
    if (Array.isArray(node.config._placeholders)) {
      node.config._placeholders = node.config._placeholders.filter(
        (p: PlaceholderFlag) => p.field !== f.field,
      );
      if (node.config._placeholders.length === 0) delete node.config._placeholders;
    }
    setByPath(node, f.field, `{{secrets.${secretName}}}`);
    nodes[idx] = node;
    resolved.push({
      nodeId: f.nodeId,
      nodeTitle: f.nodeTitle,
      field: f.field,
      secretName,
      service: service || "credential",
    });
  }

  return { workflow: { ...workflow, nodes }, resolved, remaining };
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

/** Run both phases plus placeholder annotation. AI phase is best-effort. */
export async function specifyWorkflow(
  workflow: any,
  apiKey: string | undefined,
): Promise<{ workflow: any; changes: SpecifyChange[]; placeholders: PlaceholderFlag[] }> {
  const phase1 = deterministicCleanup(workflow);
  let current = phase1.workflow;
  let changes = phase1.changes;

  if (apiKey) {
    try {
      const phase2 = await aiConcretize(current, apiKey);
      current = phase2.workflow;
      changes = [...changes, ...phase2.changes];
    } catch (e) {
      console.error("aiConcretize failed, continuing with phase1 only", e);
    }
  }

  const annotated = annotatePlaceholders(current);
  for (const f of annotated.flags) {
    changes.push({
      nodeId: f.nodeId,
      field: "placeholder",
      before: f.currentValue,
      after: null,
      reason: `${f.nodeTitle}: ${f.hint} (field ${f.field})`,
    });
  }
  return { workflow: annotated.workflow, changes, placeholders: annotated.flags };
}
