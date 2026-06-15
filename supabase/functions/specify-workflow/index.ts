// Standalone endpoint to run the Jerry Specify pass on an existing workflow
// (e.g. one already saved on the canvas). Mirrors the in-import path so users
// can re-run concretization on demand.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { specifyWorkflow } from "../_shared/specify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workflow } = await req.json();
    if (!workflow?.nodes || !Array.isArray(workflow.nodes)) {
      return new Response(
        JSON.stringify({ error: "Invalid workflow: nodes array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const { workflow: out, changes, placeholders, autoResolved, requiredEnv } =
      await specifyWorkflow(workflow, apiKey);

    return new Response(
      JSON.stringify({
        workflow: out,
        changes,
        count: changes.length,
        placeholders,
        placeholderCount: placeholders.length,
        autoResolved,
        autoResolvedCount: autoResolved.length,
        requiredEnv,
        requiredEnvCount: requiredEnv.length,
        envExample: requiredEnv.map((e: any) => `${e.name}=`).join('\n'),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("specify-workflow error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
