/**
 * Remora Flow — Remote MCP Server
 * Auth: workspace-scoped API key via `X-API-Key` (or Bearer) header.
 * Transport: MCP Streamable HTTP via mcp-lite.
 */
import { Hono } from "https://esm.sh/hono@4.6.14";
import { McpServer, StreamableHttpTransport } from "https://esm.sh/mcp-lite@0.10.0";
import { z } from "https://esm.sh/zod@3.23.8";
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
    schemaAdapter: (schema) => z.toJSONSchema(schema as z.ZodType),
  });

  mcp.tool("generate_workflow", {
    description:
      "Generate a complete Remora Flow workflow from a natural-language description. " +
      "Returns nodes, connections, and metadata ready to save, run, or sell.",
    inputSchema: z.object({
      prompt: z.string().describe("Plain-English description of the workflow to build"),
      name: z.string().optional().describe("Optional workflow name"),
      save: z.boolean().optional().describe("If true, persist to the workspace"),
    }),
    handler: async ({ prompt, name, save }) => {
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
    inputSchema: z.object({
      nodes: z.array(z.any()),
      connections: z.array(z.any()).optional(),
      mode: z.enum(["diagnose", "fix"]).optional(),
    }),
    handler: async ({ nodes, connections, mode }) => {
      return json(await invokeFn("diagnose-workflow", {
        nodes, connections: connections ?? [], mode: mode ?? "fix",
      }));
    },
  });

  mcp.tool("list_workflows", {
    description: "List workflows in the authenticated workspace.",
    inputSchema: z.object({
      limit: z.number().int().min(1).max(100).optional(),
      status: z.string().optional(),
    }),
    handler: async ({ limit, status }) => {
      let q = admin.from("workflows")
        .select("id, name, description, status, created_at, updated_at")
        .eq("workspace_id", auth.workspace_id)
        .order("updated_at", { ascending: false })
        .limit(limit ?? 25);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return json({ workflows: data });
    },
  });

  mcp.tool("get_workflow", {
    description: "Fetch a workflow by id (full nodes + connections).",
    inputSchema: z.object({ id: z.string() }),
    handler: async ({ id }) => {
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
    inputSchema: z.object({
      id: z.string(),
      price_usd: z.number().optional(),
      category: z.string().optional(),
    }),
    handler: async ({ id, price_usd, category }) => {
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
