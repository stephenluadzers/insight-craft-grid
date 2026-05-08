import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Takes an array of "unknown" nodes from an imported workflow JSON and asks
// Lovable AI to synthesize a proper node definition for each one.
// Output shape per node: { id, type, title, description, config }
// where `type` is one of the canvas's valid types.
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const VALID_TYPES = [
      "trigger", "action", "condition", "delay", "webhook",
      "transform", "loop", "parallel", "error_handler",
      "guardrail", "ai_agent", "integration",
    ];

    const systemPrompt = `You convert raw, unknown workflow node definitions (from arbitrary JSON exports like n8n, Make, Zapier, custom DSLs) into normalized nodes for our canvas. For each input node, return a clean node with:
- id: keep input id if present, else generate
- type: pick the BEST match from: ${VALID_TYPES.join(", ")}
- title: short human-readable name
- description: 1-sentence summary of what the node does
- config: object with all relevant settings inferred from the input (url, method, headers, params, prompts, etc.)
Preserve the user's original intent. Map vendor-specific types to our types intelligently.`;

    const userPrompt = `Normalize these ${unknownNodes.length} unknown nodes into our schema:\n\n${JSON.stringify(unknownNodes, null, 2)}`;

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
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : { nodes: [] };

    return new Response(JSON.stringify({ enriched: args.nodes || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("enrich-imported-nodes error:", error);
    return new Response(JSON.stringify({ error: error.message, enriched: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
