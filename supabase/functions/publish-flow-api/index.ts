import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Wave 3 — Public HTTP endpoint for workflows published as APIs.
// URL pattern: /publish-flow-api/<slug>

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const slug = url.pathname.split("/").filter(Boolean).pop();
  if (!slug) {
    return new Response(JSON.stringify({ error: "Missing slug" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: api, error } = await supabase
    .from("published_workflow_apis")
    .select("id, workflow_id, method, auth_required, is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !api || !api.is_active) {
    return new Response(JSON.stringify({ error: "Endpoint not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method !== api.method) {
    return new Response(JSON.stringify({ error: `Use ${api.method}` }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (api.auth_required) {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Minimal validation against api_keys table
    const { data: keyRow } = await supabase
      .from("api_keys")
      .select("id, is_active")
      .eq("key_value", apiKey)
      .maybeSingle();
    if (!keyRow?.is_active) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  let payload: unknown = null;
  if (req.method !== "GET") {
    try {
      payload = await req.json();
    } catch {
      payload = null;
    }
  } else {
    payload = Object.fromEntries(url.searchParams);
  }

  // Hand off to execute-workflow function
  const exec = await fetch(
    `${Deno.env.get("SUPABASE_URL")}/functions/v1/execute-workflow`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ workflowId: api.workflow_id, input: payload }),
    }
  );
  const result = await exec.json().catch(() => ({ ok: false }));

  // Best-effort counter increment
  const { data: current } = await supabase
    .from("published_workflow_apis")
    .select("request_count")
    .eq("id", api.id)
    .maybeSingle();
  await supabase
    .from("published_workflow_apis")
    .update({ request_count: (current?.request_count ?? 0) + 1 })
    .eq("id", api.id);

  return new Response(JSON.stringify({ ok: true, result }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
