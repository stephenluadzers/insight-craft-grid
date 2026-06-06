// Wave 1 — Run Replay
// Re-runs an existing execution (optionally starting from a specific node)
// by creating a fresh workflow_executions row that references the original.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { executionId, fromNodeId, overrideInput } = await req.json();
    if (!executionId) return json({ error: "executionId required" }, 400);

    const auth = req.headers.get("Authorization") ?? "";
    const user = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: userRes } = await user.auth.getUser();
    if (!userRes?.user) return json({ error: "Unauthorized" }, 401);

    const { data: original, error: e1 } = await admin
      .from("workflow_executions")
      .select("*")
      .eq("id", executionId)
      .maybeSingle();
    if (e1 || !original) return json({ error: "Original execution not found" }, 404);

    // Collect step logs up to fromNodeId (replay strategy: replay from fromNodeId
    // forward, reusing earlier outputs).
    const { data: priorLogs } = await admin
      .from("run_step_logs")
      .select("node_id, output_payload")
      .eq("execution_id", executionId)
      .eq("status", "completed")
      .order("started_at", { ascending: true });

    const replayPayload = {
      original_execution_id: executionId,
      from_node_id: fromNodeId ?? null,
      override_input: overrideInput ?? null,
      reused_outputs: (priorLogs ?? []).reduce((acc: Record<string, any>, row: any) => {
        if (fromNodeId && row.node_id === fromNodeId) return acc;
        acc[row.node_id] = row.output_payload;
        return acc;
      }, {}),
    };

    const { data: replay, error: e2 } = await admin
      .from("workflow_executions")
      .insert({
        workflow_id: original.workflow_id,
        user_id: userRes.user.id,
        status: "queued",
        input_data: { ...(original.input_data ?? {}), _replay: replayPayload },
      })
      .select()
      .single();
    if (e2) return json({ error: e2.message }, 500);

    return json({ replay });
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
