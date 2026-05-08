import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

// Takes an array of "unknown" nodes from an imported workflow JSON.
// 1. Looks each rawType up in `learned_node_types` (cache).
// 2. For any still-unknown ones, asks Lovable AI to synthesize a definition.
// 3. Saves the AI results back to `learned_node_types` so future imports
//    are instant and the system keeps learning.

const VALID_TYPES = [
  "trigger", "action", "condition", "delay", "webhook",
  "transform", "loop", "parallel", "error_handler",
  "guardrail", "ai_agent", "integration",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { unknownNodes } = await req.json();
    if (!Array.isArray(unknownNodes) || unknownNodes.length === 0) {
      return new Response(JSON.stringify({ enriched: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // Identify caller (for created_by tracking) — best effort.
    let userId: string | null = null;
    try {
      const auth = req.headers.get("Authorization");
      if (auth) {
        const token = auth.replace("Bearer ", "");
        const { data } = await supabase.auth.getUser(token);
        userId = data.user?.id ?? null;
      }
    } catch (_) { /* anonymous is fine */ }

    // ---- 1. Cache lookup --------------------------------------------------
    const rawTypes = Array.from(new Set(
      unknownNodes.map((n: any) => String(n?.rawType || "").toLowerCase()).filter(Boolean)
    ));

    const cache: Record<string, any> = {};
    if (rawTypes.length > 0) {
      const { data: learned } = await supabase
        .from("learned_node_types")
        .select("*")
        .in("raw_type", rawTypes);
      for (const row of learned || []) cache[row.raw_type] = row;
    }

    const enriched: any[] = [];
    const stillUnknown: any[] = [];

    for (const n of unknownNodes) {
      const key = String(n?.rawType || "").toLowerCase();
      const cached = cache[key];
      if (cached) {
        enriched.push({
          id: n.id,
          type: cached.mapped_type,
          title: n.title || cached.title,
          description: n.description || cached.description || "",
          config: { ...(cached.config_template || {}), ...(n.config || {}) },
        });
        // bump usage counter (fire and forget)
        supabase.from("learned_node_types")
          .update({ usage_count: (cached.usage_count || 0) + 1 })
          .eq("id", cached.id)
          .then(() => {});
      } else {
        stillUnknown.push(n);
      }
    }

    // ---- 2. AI synthesis for the remainder --------------------------------
    if (stillUnknown.length > 0) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      const systemPrompt = `You convert raw, unknown workflow node definitions (from arbitrary JSON exports like n8n, Make, Zapier, custom DSLs) into normalized nodes for our canvas. For each input node, return a clean node with:
- id: keep input id if present, else generate
- type: pick the BEST match from: ${VALID_TYPES.join(", ")}
- title: short human-readable name
- description: 1-sentence summary of what the node does
- config: object with all relevant settings inferred from the input (url, method, headers, params, prompts, etc.)
Preserve the user's original intent. Map vendor-specific types to our types intelligently.`;

      const userPrompt = `Normalize these ${stillUnknown.length} unknown nodes into our schema:\n\n${JSON.stringify(stillUnknown, null, 2)}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 110_000);

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [{
            type: "function",
            function: {
              name: "return_normalized_nodes",
              description: "Return the normalized workflow nodes",
              parameters: {
                type: "object",
                properties: {
                  nodes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        type: { type: "string", enum: VALID_TYPES },
                        title: { type: "string" },
                        description: { type: "string" },
                        config: { type: "object", additionalProperties: true },
                      },
                      required: ["id", "type", "title"],
                    },
                  },
                },
                required: ["nodes"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "return_normalized_nodes" } },
        }),
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AI gateway error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
      const aiNodes: any[] = toolCall ? JSON.parse(toolCall.function.arguments)?.nodes || [] : [];

      // Match AI results back to original input by id, push to enriched, and persist.
      const aiById: Record<string, any> = {};
      for (const a of aiNodes) if (a?.id) aiById[a.id] = a;

      const upserts: any[] = [];
      for (const n of stillUnknown) {
        const a = aiById[n.id];
        if (!a) continue;
        enriched.push({
          id: n.id,
          type: a.type,
          title: a.title || n.title,
          description: a.description || n.description || "",
          config: { ...(n.config || {}), ...(a.config || {}) },
        });
        const key = String(n?.rawType || "").toLowerCase();
        if (key && !upserts.find((u) => u.raw_type === key)) {
          upserts.push({
            raw_type: key,
            mapped_type: a.type,
            title: a.title || n.title || key,
            description: a.description || "",
            config_template: a.config || {},
            source: "ai_enrichment",
            created_by: userId,
            usage_count: 1,
          });
        }
      }

      // ---- 3. Persist learnings -----------------------------------------
      if (upserts.length > 0) {
        const { error: upsertErr } = await supabase
          .from("learned_node_types")
          .upsert(upserts, { onConflict: "raw_type" });
        if (upsertErr) console.error("Failed to save learned nodes:", upsertErr);
        else console.log(`💡 Learned ${upserts.length} new node type(s):`, upserts.map((u) => u.raw_type));
      }
    }

    return new Response(
      JSON.stringify({
        enriched,
        cacheHits: enriched.length - stillUnknown.length,
        learned: stillUnknown.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("enrich-imported-nodes error:", error);
    return new Response(
      JSON.stringify({ error: error.message, enriched: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
