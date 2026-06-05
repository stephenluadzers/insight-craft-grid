/**
 * Remora Flow — Remote MCP Server
 *
 * Exposes Remora Flow capabilities as MCP tools for remote AI agents
 * (Claude, ChatGPT, Cursor, custom AI executive assistants, etc.).
 *
 * Auth: workspace-scoped API key via `X-API-Key` header (existing api_keys table).
 * Transport: Streamable HTTP (MCP spec). Mount this URL in any MCP-compatible client:
 *   https://<project>.functions.supabase.co/mcp-server
 *
 * Tools exposed:
 *   - generate_workflow         Create a workflow from a natural-language prompt
 *   - diagnose_workflow         Run the Workflow Doctor on an existing/messy workflow
 *   - list_workflows            List workflows in the API key's workspace
 *   - get_workflow              Fetch a single workflow by id
 *   - export_workflow           Return a sellable package payload (nodes + metadata + ROI inputs)
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

async function hashKey(apiKey: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(apiKey));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyApiKey(apiKey: string) {
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
  await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return data;
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
  let parsed: any;
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  if (!res.ok) throw new Error(`${name} failed (${res.status}): ${text.slice(0, 400)}`);
  return parsed as T;
}

// ---- MCP server -----------------------------------------------------------

const mcp = new McpServer({
  name: "remora-flow",
  version: "1.0.0",
});

type Ctx = { auth: { workspace_id: string; user_id: string } };

mcp.tool({
  name: "generate_workflow",
  description:
    "Generate a complete Remora Flow workflow from a natural-language description. " +
    "Returns nodes, connections, and metadata ready to save, run, or sell on the marketplace.",
  inputSchema: {
    type: "object",
    properties: {
      prompt: { type: "string", description: "Plain-English description of the workflow to build." },
      name: { type: "string", description: "Optional workflow name. Auto-derived if omitted." },
      save: { type: "boolean", description: "If true, persist to the workspace. Default false." },
    },
    required: ["prompt"],
  },
  handler: async ({ prompt, name, save }, extra: any) => {
    const auth = extra?.context?.auth as Ctx["auth"];
    const result = await invokeFn("generate-workflow-from-text", { prompt });
    const workflow = result?.workflow ?? result;
    let saved_id: string | undefined;
    if (save && auth) {
      const { data } = await admin
        .from("workflows")
        .insert({
          workspace_id: auth.workspace_id,
          user_id: auth.user_id,
          name: name || workflow?.name || "Untitled Workflow",
          description: workflow?.description ?? null,
          nodes: workflow?.nodes ?? [],
          connections: workflow?.connections ?? [],
          status: "draft",
        })
        .select("id")
        .single();
      saved_id = data?.id;
    }
    return {
      content: [
        { type: "text", text: JSON.stringify({ workflow, saved_id }, null, 2) },
      ],
    };
  },
});

mcp.tool({
  name: "diagnose_workflow",
  description:
    "Run the Workflow Doctor: deep semantic + structural diagnosis of a messy or broken workflow. " +
    "Returns health score, issues, and an optionally repaired version.",
  inputSchema: {
    type: "object",
    properties: {
      nodes: { type: "array", description: "Workflow nodes." },
      connections: { type: "array", description: "Workflow connections (edges)." },
      mode: { type: "string", enum: ["diagnose", "fix"], description: "diagnose = report only; fix = include repaired workflow." },
    },
    required: ["nodes"],
  },
  handler: async ({ nodes, connections, mode }) => {
    const result = await invokeFn("diagnose-workflow", {
      nodes,
      connections: connections ?? [],
      mode: mode ?? "fix",
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
});

mcp.tool({
  name: "list_workflows",
  description: "List workflows in the authenticated workspace.",
  inputSchema: {
    type: "object",
    properties: {
      limit: { type: "number", description: "Max rows (default 25, max 100)." },
      status: { type: "string", description: "Optional status filter (draft, active, archived)." },
    },
  },
  handler: async ({ limit, status }, extra: any) => {
    const auth = extra?.context?.auth as Ctx["auth"];
    let q = admin
      .from("workflows")
      .select("id, name, description, status, created_at, updated_at")
      .eq("workspace_id", auth.workspace_id)
      .order("updated_at", { ascending: false })
      .limit(Math.min(Number(limit) || 25, 100));
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify({ workflows: data }, null, 2) }] };
  },
});

mcp.tool({
  name: "get_workflow",
  description: "Fetch a single workflow by id (nodes + connections included).",
  inputSchema: {
    type: "object",
    properties: { id: { type: "string", description: "Workflow id (uuid)." } },
    required: ["id"],
  },
  handler: async ({ id }, extra: any) => {
    const auth = extra?.context?.auth as Ctx["auth"];
    const { data, error } = await admin
      .from("workflows")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", auth.workspace_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Workflow not found");
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

mcp.tool({
  name: "export_workflow",
  description:
    "Build a sellable package payload for a workflow: nodes, connections, metadata, suggested " +
    "pricing, and a marketplace-ready description. Use this when preparing to sell a workflow.",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Workflow id to export." },
      price_usd: { type: "number", description: "Optional asking price in USD." },
      category: { type: "string", description: "Marketplace category (e.g. 'sales', 'ops')." },
    },
    required: ["id"],
  },
  handler: async ({ id, price_usd, category }, extra: any) => {
    const auth = extra?.context?.auth as Ctx["auth"];
    const { data: wf, error } = await admin
      .from("workflows")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", auth.workspace_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!wf) throw new Error("Workflow not found");

    const nodeCount = Array.isArray(wf.nodes) ? wf.nodes.length : 0;
    const pkg = {
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
    };
    return { content: [{ type: "text", text: JSON.stringify(pkg, null, 2) }] };
  },
});

// ---- HTTP transport -------------------------------------------------------

const transport = new StreamableHttpTransport();
const handler = transport.bind(mcp);
const app = new Hono();

app.options("/*", (c) => new Response(null, { headers: corsHeaders }));

app.all("/*", async (c) => {
  const req = c.req.raw;

  // Public discovery: allow unauthenticated GET to root for health-check pings
  if (req.method === "GET" && new URL(req.url).pathname.endsWith("/mcp-server")) {
    // fall through to MCP transport (handles SSE etc.)
  }

  const apiKey =
    req.headers.get("x-api-key") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";

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

  // Pass auth into tool handlers via context
  const res = await handler(req, { context: { auth } } as any);
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(corsHeaders)) out.headers.set(k, v);
  return out;
});

Deno.serve(app.fetch);
