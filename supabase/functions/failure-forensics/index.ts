// Wave 1 — Failure Forensics AI
// Reads a failed run + node config, asks Gemini to explain the root cause
// and propose a one-click patch. Caches the diagnosis.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { executionId, nodeId, workflowId } = await req.json();
    if (!executionId || !nodeId || !workflowId) {
      return json({ error: "executionId, nodeId, workflowId required" }, 400);
    }
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Cache check
    const { data: cached } = await admin
      .from("workflow_failure_diagnostics")
      .select("*")
      .eq("execution_id", executionId)
      .eq("node_id", nodeId)
      .maybeSingle();
    if (cached) return json({ diagnosis: cached, cached: true });

    // Gather context
    const [{ data: stepLog }, { data: workflow }] = await Promise.all([
      admin.from("run_step_logs")
        .select("*")
        .eq("execution_id", executionId)
        .eq("node_id", nodeId)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin.from("workflows").select("nodes,connections").eq("id", workflowId).maybeSingle(),
    ]);

    const nodeConfig = (workflow?.nodes ?? []).find((n: any) => n.id === nodeId) ?? null;

    const prompt = `You are a workflow debugging expert. A node failed. Diagnose the root cause and propose a concrete fix.

NODE CONFIG:
${JSON.stringify(nodeConfig, null, 2)}

STEP LOG:
${JSON.stringify(stepLog, null, 2)}

Return JSON only:
{
  "root_cause": "1 sentence",
  "explanation": "2-4 sentences explaining what went wrong and why",
  "suggested_fix": { "summary": "short", "patch": { "config": {} } },
  "confidence": 0.0-1.0
}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a senior reliability engineer. Always reply with strict JSON." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return json({ error: "AI gateway error", detail: txt, status: aiRes.status }, 502);
    }

    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { root_cause: "Unparseable AI response", explanation: content, confidence: 0.3 }; }

    const { data: userRes } = await userClient.auth.getUser();

    const { data: saved, error: saveErr } = await admin
      .from("workflow_failure_diagnostics")
      .insert({
        execution_id: executionId,
        workflow_id: workflowId,
        node_id: nodeId,
        root_cause: parsed.root_cause ?? "Unknown",
        explanation: parsed.explanation ?? "",
        suggested_fix: parsed.suggested_fix ?? null,
        confidence: Math.min(1, Math.max(0, Number(parsed.confidence ?? 0.5))),
        created_by: userRes?.user?.id ?? null,
      })
      .select()
      .single();

    if (saveErr) return json({ error: saveErr.message }, 500);
    return json({ diagnosis: saved, cached: false });
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
