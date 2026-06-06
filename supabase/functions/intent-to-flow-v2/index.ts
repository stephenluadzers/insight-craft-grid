// Wave 2 — Intent-First Generator v2
// Produces a complete flow with error branches, retries, and credential placeholders
// from a single natural-language description.

import { corsHeaders } from "../_shared/cors.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const SCHEMA_TOOL = {
  type: "function",
  function: {
    name: "emit_workflow",
    description: "Emit a complete production-quality workflow.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        summary: { type: "string" },
        nodes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              type: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              config: { type: "object" },
              retry: {
                type: "object",
                properties: {
                  max_attempts: { type: "integer" },
                  backoff: { type: "string", enum: ["none","linear","exponential"] },
                },
              },
              credentials_required: { type: "array", items: { type: "string" } },
              x: { type: "integer" },
              y: { type: "integer" },
            },
            required: ["id","type","title"],
          },
        },
        connections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              from: { type: "string" },
              to: { type: "string" },
              branch: { type: "string", enum: ["success","error"] },
            },
            required: ["from","to"],
          },
        },
        credentials_needed: { type: "array", items: { type: "string" } },
        next_steps: { type: "array", items: { type: "string" } },
      },
      required: ["name","nodes","connections"],
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { intent, context } = await req.json();
    if (!intent) return json({ error: "intent required" }, 400);
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    const system = `You generate production-quality automation workflows. ALWAYS include:
1. A trigger node.
2. Realistic action nodes for each integration mentioned.
3. Error-branch edges (connection.branch="error") for every node that can fail.
4. A retry policy on every external/IO node.
5. credentials_required for any node needing API keys.
6. Nodes laid out left-to-right, x increments of 280, y centered around 200 with branches +/-150.
Return ONLY via the emit_workflow tool.`;

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 90_000);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Intent: ${intent}\n\nExtra context: ${JSON.stringify(context ?? {})}` },
        ],
        tools: [SCHEMA_TOOL],
        tool_choice: { type: "function", function: { name: "emit_workflow" } },
      }),
    }).finally(() => clearTimeout(t));

    if (!res.ok) {
      const txt = await res.text();
      return json({ error: "AI gateway error", detail: txt, status: res.status }, 502);
    }
    const data = await res.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return json({ error: "No tool call returned", raw: data }, 502);
    let workflow: any;
    try { workflow = JSON.parse(call.function.arguments); }
    catch { return json({ error: "Bad tool args", raw: call.function.arguments }, 502); }

    return json({ workflow });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
