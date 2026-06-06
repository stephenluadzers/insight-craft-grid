// Wave 2 — AI Test-Case Generator
// Auto-synthesize happy_path, edge_case, error_case test inputs for a workflow.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const TOOL = {
  type: "function",
  function: {
    name: "emit_test_cases",
    description: "Emit synthetic test cases covering happy path, edge cases, and error cases.",
    parameters: {
      type: "object",
      properties: {
        cases: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              category: { type: "string", enum: ["happy_path","edge_case","error_case","load"] },
              input_payload: { type: "object" },
              expected_output: { type: "object" },
              assertions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    path: { type: "string" },
                    op: { type: "string", enum: ["equals","contains","exists","gt","lt"] },
                    value: {},
                  },
                  required: ["path","op"],
                },
              },
            },
            required: ["name","category","input_payload"],
          },
        },
      },
      required: ["cases"],
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { workflowId, count = 6 } = await req.json();
    if (!workflowId) return json({ error: "workflowId required" }, 400);
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    const user = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: userRes } = await user.auth.getUser();
    if (!userRes?.user) return json({ error: "Unauthorized" }, 401);

    const { data: workflow, error } = await admin
      .from("workflows")
      .select("id,name,nodes,connections")
      .eq("id", workflowId)
      .maybeSingle();
    if (error || !workflow) return json({ error: "Workflow not found" }, 404);

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 90_000);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a QA engineer. Generate concrete, runnable test cases. Mix categories: ~half happy_path, ~third edge_case, rest error_case." },
          { role: "user", content: `Workflow: ${workflow.name}\nNodes: ${JSON.stringify(workflow.nodes)}\nConnections: ${JSON.stringify(workflow.connections)}\n\nGenerate ${count} diverse test cases.` },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "emit_test_cases" } },
      }),
    }).finally(() => clearTimeout(t));

    if (!res.ok) {
      const txt = await res.text();
      return json({ error: "AI gateway error", detail: txt, status: res.status }, 502);
    }
    const data = await res.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return json({ error: "No tool call returned" }, 502);
    const parsed = JSON.parse(call.function.arguments);
    const cases = (parsed.cases ?? []).slice(0, count);

    const inserts = cases.map((c: any) => ({
      workflow_id: workflowId,
      name: c.name,
      description: c.description ?? null,
      category: c.category ?? "happy_path",
      input_payload: c.input_payload ?? {},
      expected_output: c.expected_output ?? null,
      assertions: c.assertions ?? [],
      ai_generated: true,
      created_by: userRes.user.id,
    }));

    const { data: saved, error: insErr } = await admin
      .from("workflow_test_cases").insert(inserts).select();
    if (insErr) return json({ error: insErr.message }, 500);

    return json({ created: saved?.length ?? 0, cases: saved });
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
