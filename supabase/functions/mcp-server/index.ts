/**
 * Remora Flow — Remote MCP Server
 * Auth: workspace-scoped API key via `X-API-Key` (or Bearer) header.
 * Transport: MCP Streamable HTTP via mcp-lite.
 */
import { Hono } from "https://esm.sh/hono@4.6.14";
import { McpServer, StreamableHttpTransport } from "https://esm.sh/mcp-lite@0.10.0";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, mcp-session-id",
  "Access-Control-Expose-Headers": "mcp-session-id",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

type Auth = { workspace_id: string; user_id: string };

async function hashKey(apiKey: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(apiKey));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyApiKey(apiKey: string): Promise<Auth | null> {
  if (!apiKey) return null;
  const key_hash = await hashKey(apiKey);
  const { data } = await admin
    .from("api_keys")
    .select("id, user_id, workspace_id, expires_at, is_active")
    .eq("key_hash", key_hash)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
  admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id).then(() => {});
  return { workspace_id: data.workspace_id, user_id: data.user_id };
}

async function invokeFn<T = any>(name: string, body: unknown): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE}`,
      apikey: SERVICE_ROLE,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${name} (${res.status}): ${text.slice(0, 400)}`);
  try { return JSON.parse(text); } catch { return { raw: text } as T; }
}

const json = (obj: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(obj, null, 2) }] });

function buildServer(auth: Auth): McpServer {
  const mcp = new McpServer({
    name: "remora-flow",
    version: "1.0.0",
    schemaAdapter: (schema: unknown) => schema, // JSON Schema passed through
  });

  mcp.tool("generate_workflow", {
    description:
      "Generate a complete Remora Flow workflow from a natural-language description. " +
      "Returns nodes, connections, and metadata ready to save, run, or sell.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Plain-English description of the workflow" },
        name: { type: "string", description: "Optional workflow name" },
        save: { type: "boolean", description: "If true, persist to the workspace" },
      },
      required: ["prompt"],
    },
    handler: async (args: any) => {
      const { prompt, name, save } = args ?? {};
      const result = await invokeFn("generate-workflow-from-text", { prompt });
      const workflow = result?.workflow ?? result;
      let saved_id: string | undefined;
      if (save) {
        const { data } = await admin.from("workflows").insert({
          workspace_id: auth.workspace_id,
          user_id: auth.user_id,
          name: name || workflow?.name || "Untitled Workflow",
          description: workflow?.description ?? null,
          nodes: workflow?.nodes ?? [],
          connections: workflow?.connections ?? [],
          status: "draft",
        }).select("id").single();
        saved_id = data?.id;
      }
      return json({ workflow, saved_id });
    },
  });

  mcp.tool("diagnose_workflow", {
    description:
      "Run the Workflow Doctor: deep semantic + structural diagnosis. Returns health score, " +
      "issues, and (in 'fix' mode) a repaired workflow.",
    inputSchema: {
      type: "object",
      properties: {
        nodes: { type: "array" },
        connections: { type: "array" },
        mode: { type: "string", enum: ["diagnose", "fix"] },
      },
      required: ["nodes"],
    },
    handler: async (args: any) => {
      const { nodes, connections, mode } = args ?? {};
      return json(await invokeFn("diagnose-workflow", {
        nodes, connections: connections ?? [], mode: mode ?? "fix",
      }));
    },
  });

  mcp.tool("list_workflows", {
    description: "List workflows in the authenticated workspace.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number" },
        status: { type: "string" },
      },
    },
    handler: async (args: any) => {
      const { limit, status } = args ?? {};
      let q = admin.from("workflows")
        .select("id, name, description, status, created_at, updated_at")
        .eq("workspace_id", auth.workspace_id)
        .order("updated_at", { ascending: false })
        .limit(Math.min(Number(limit) || 25, 100));
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return json({ workflows: data });
    },
  });

  mcp.tool("get_workflow", {
    description: "Fetch a workflow by id (full nodes + connections).",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
    handler: async (args: any) => {
      const { id } = args ?? {};
      const { data, error } = await admin.from("workflows").select("*")
        .eq("id", id).eq("workspace_id", auth.workspace_id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Workflow not found");
      return json(data);
    },
  });

  mcp.tool("export_workflow", {
    description:
      "Build a sellable package payload for a workflow: nodes, connections, metadata, suggested " +
      "pricing, and marketplace description. Use when preparing to sell.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        price_usd: { type: "number" },
        category: { type: "string" },
      },
      required: ["id"],
    },
    handler: async (args: any) => {
      const { id, price_usd, category } = args ?? {};
      const { data: wf, error } = await admin.from("workflows").select("*")
        .eq("id", id).eq("workspace_id", auth.workspace_id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!wf) throw new Error("Workflow not found");
      const nodeCount = Array.isArray(wf.nodes) ? wf.nodes.length : 0;
      return json({
        name: wf.name,
        description: wf.description,
        version: "1.0.0",
        nodes: wf.nodes,
        connections: wf.connections,
        metadata: {
          node_count: nodeCount,
          category: category ?? "automation",
          suggested_price_usd: price_usd ?? Math.max(19, nodeCount * 5),
          exported_at: new Date().toISOString(),
          source: "remora-flow-mcp",
        },
        marketplace_ready: true,
      });
    },
  });

  // ───────────────────────── NOTES & DEEP READ ─────────────────────────

  mcp.tool("list_all_notes", {
    description:
      "Read EVERY note across the workspace: workflow_comments rows + any node whose type is " +
      "'note'/'comment'/'sticky' or which has a description/notes field. Use to give the agent " +
      "full context on what the user has documented.",
    inputSchema: {
      type: "object",
      properties: {
        workflow_id: { type: "string", description: "Optional: scope to one workflow" },
        limit: { type: "number" },
      },
    },
    handler: async (args: any) => {
      const { workflow_id, limit } = args ?? {};
      const cap = Math.min(Number(limit) || 500, 2000);

      let wfQuery = admin
        .from("workflows")
        .select("id, name, description, nodes")
        .eq("workspace_id", auth.workspace_id);
      if (workflow_id) wfQuery = wfQuery.eq("id", workflow_id);
      const { data: workflows, error: wfErr } = await wfQuery;
      if (wfErr) throw new Error(wfErr.message);

      const ids = (workflows ?? []).map((w: any) => w.id);
      let comments: any[] = [];
      if (ids.length) {
        let cQ = admin
          .from("workflow_comments")
          .select("id, workflow_id, user_id, content, created_at, updated_at")
          .in("workflow_id", ids)
          .order("created_at", { ascending: false })
          .limit(cap);
        const { data, error } = await cQ;
        if (error) throw new Error(error.message);
        comments = data ?? [];
      }

      const node_notes: any[] = [];
      for (const w of workflows ?? []) {
        const nodes = Array.isArray(w.nodes) ? w.nodes : [];
        for (const n of nodes) {
          const t = (n?.type ?? "").toLowerCase();
          const isNoteNode = ["note", "comment", "sticky", "annotation"].includes(t);
          const desc = n?.description ?? n?.config?.description ?? n?.config?.notes;
          if (isNoteNode || desc) {
            node_notes.push({
              workflow_id: w.id,
              workflow_name: w.name,
              node_id: n.id,
              node_type: n.type,
              title: n.title ?? null,
              text: isNoteNode ? n?.config?.text ?? n?.config?.content ?? desc : desc,
            });
          }
        }
      }

      return json({
        workflow_descriptions: (workflows ?? []).map((w: any) => ({
          id: w.id, name: w.name, description: w.description,
        })),
        comments,
        node_notes,
        totals: {
          workflows: workflows?.length ?? 0,
          comments: comments.length,
          node_notes: node_notes.length,
        },
      });
    },
  });

  mcp.tool("search_workspace", {
    description:
      "Full-text search across every workflow's name, description, node titles, node configs, " +
      "and comments. Returns matching workflows + matched fragments.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" }, limit: { type: "number" } },
      required: ["query"],
    },
    handler: async (args: any) => {
      const { query, limit } = args ?? {};
      const q = String(query).toLowerCase();
      const { data: workflows, error } = await admin
        .from("workflows")
        .select("id, name, description, nodes, updated_at")
        .eq("workspace_id", auth.workspace_id);
      if (error) throw new Error(error.message);

      const hits: any[] = [];
      for (const w of workflows ?? []) {
        const matches: string[] = [];
        if (w.name?.toLowerCase().includes(q)) matches.push(`name: ${w.name}`);
        if (w.description?.toLowerCase().includes(q)) matches.push(`description: ${w.description.slice(0,200)}`);
        const nodes = Array.isArray(w.nodes) ? w.nodes : [];
        for (const n of nodes) {
          const blob = JSON.stringify(n).toLowerCase();
          if (blob.includes(q)) matches.push(`node[${n.id}/${n.type}]: ${n.title ?? ""}`);
        }
        if (matches.length) hits.push({ id: w.id, name: w.name, matches: matches.slice(0, 10) });
      }
      return json({ query, results: hits.slice(0, Math.min(Number(limit) || 50, 200)) });
    },
  });

  // ───────────────────────── INTEGRATIONS ─────────────────────────

  const INTEGRATIONS: Record<string, { description: string; fn: string; sample: any }> = {
    generate_from_url: {
      description: "Generate a workflow from a website URL.",
      fn: "analyze-workflow-website",
      sample: { url: "https://example.com" },
    },
    generate_from_api: {
      description: "Generate a workflow from a Swagger/OpenAPI spec or API URL.",
      fn: "generate-workflow-from-api",
      sample: { spec_url: "https://api.example.com/openapi.json" },
    },
    generate_from_github: {
      description: "Generate a workflow by analyzing a GitHub repo.",
      fn: "analyze-github-repo",
      sample: { repo_url: "https://github.com/owner/repo" },
    },
    generate_from_youtube: {
      description: "Generate a workflow from a YouTube tutorial.",
      fn: "analyze-youtube-video",
      sample: { video_url: "https://youtube.com/watch?v=..." },
    },
    optimize_workflow: {
      description: "Optimize an existing workflow's nodes for performance.",
      fn: "optimize-workflow",
      sample: { nodes: [], connections: [] },
    },
    self_heal_workflow: {
      description: "Auto-fix structural issues in a workflow.",
      fn: "self-heal-workflow",
      sample: { nodes: [], connections: [] },
    },
    execute_workflow: {
      description: "Execute a saved workflow by id.",
      fn: "execute-workflow",
      sample: { workflow_id: "uuid", input: {} },
    },
    suggest_integrations: {
      description: "Suggest integrations to add based on a workflow's intent.",
      fn: "suggest-integrations",
      sample: { workflow_id: "uuid" },
    },
    scan_security: {
      description: "Run a security scan on a workflow.",
      fn: "calculate-health-score",
      sample: { workflow_id: "uuid" },
    },
    validate_credential: {
      description: "Validate a third-party credential is live.",
      fn: "validate-credential",
      sample: { service: "stripe", credentials: {} },
    },
    run_full_pipeline: {
      description: "Generate → Optimize → Guard → Export a sellable workflow in one call.",
      fn: "ai-workflow-pipeline",
      sample: { prompt: "..." },
    },
  };

  mcp.tool("list_integrations", {
    description:
      "List every integration the agent can call (like the bottom-left node list in the canvas). " +
      "Each entry shows id, description, and a sample input.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => json({
      integrations: Object.entries(INTEGRATIONS).map(([id, v]) => ({
        id, description: v.description, sample_input: v.sample,
      })),
    }),
  });

  mcp.tool("call_integration", {
    description:
      "Invoke any integration from `list_integrations` by id. The `input` object is forwarded " +
      "to the underlying capability and the result is returned verbatim.",
    inputSchema: {
      type: "object",
      properties: {
        integration_id: { type: "string" },
        input: { type: "object" },
      },
      required: ["integration_id"],
    },
    handler: async (args: any) => {
      const { integration_id, input } = args ?? {};
      const spec = INTEGRATIONS[integration_id];
      if (!spec) throw new Error(`Unknown integration: ${integration_id}`);
      const result = await invokeFn(spec.fn, {
        ...(input ?? {}),
        _workspace_id: auth.workspace_id,
        _user_id: auth.user_id,
      });
      return json({ integration_id, result });
    },
  });

  return mcp;
}

const app = new Hono();

app.options("/*", () => new Response(null, { headers: corsHeaders }));

app.all("/*", async (c) => {
  const req = c.req.raw;
  const apiKey =
    req.headers.get("x-api-key") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";

  const auth = await verifyApiKey(apiKey);
  if (!auth) {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Unauthorized: missing or invalid X-API-Key" },
        id: null,
      }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const mcp = buildServer(auth);
  const handler = new StreamableHttpTransport().bind(mcp);
  const res = await handler(req);
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(corsHeaders)) out.headers.set(k, v);
  return out;
});

Deno.serve(app.fetch);
