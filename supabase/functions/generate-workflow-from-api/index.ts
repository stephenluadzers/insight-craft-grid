import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { injectGuardrailNodes } from "../_shared/guardrails.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type, url, method, headers, description, specContent, apiName, baseUrl, prompt } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "url") {
      systemPrompt = `You are an expert workflow architect. Given an API endpoint, create a production-ready workflow that integrates with it. Include trigger, API call nodes, data transformation, error handling, and output actions. Each node should have a config object with relevant settings (url, method, headers, etc). Target 5-12 nodes.`;
      userPrompt = `Create a workflow for this API endpoint:
URL: ${url}
Method: ${method || "GET"}
Headers: ${headers || "none"}
Description: ${description || "Integrate with this API endpoint"}

Generate nodes that: set up a trigger, prepare the request, call the API, handle errors, transform the response, and take action on the result.`;
    } else if (type === "spec") {
      const specPreview = (specContent || "").substring(0, 8000);
      systemPrompt = `You are an expert workflow architect. Given an OpenAPI/Swagger specification, create a comprehensive workflow that covers the key endpoints. Include trigger nodes, API call nodes for the most important operations, data transformations, error handlers, and output actions. Each API call node should include the endpoint path, method, and parameters in its config. Target 8-15 nodes.`;
      userPrompt = `Create a workflow from this OpenAPI specification:\n\n${specPreview}\n\nGenerate a workflow that covers the most important API operations, with proper error handling and data flow.`;
    } else if (type === "library") {
      systemPrompt = `You are an expert workflow architect. Create a production-ready workflow that integrates with the ${apiName} API (${baseUrl}). Include realistic API call nodes with proper endpoints, authentication setup, data transformations, error handling, and output actions. Each API call node config should include: url, method, headers, and description of the expected request/response. Target 6-12 nodes.`;
      userPrompt = prompt || `Create a comprehensive workflow integrating with ${apiName} API at ${baseUrl}. ${description || ""}`;
    } else {
      return new Response(JSON.stringify({ error: "Invalid import type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.15,
        tools: [{
          type: "function",
          function: {
            name: "create_api_workflow",
            description: "Create a workflow from API information",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                nodes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      type: { type: "string", enum: ["trigger", "action", "condition", "data", "ai", "connector", "error_handler", "guardrail"] },
                      title: { type: "string" },
                      description: { type: "string" },
                      x: { type: "number" },
                      y: { type: "number" },
                      config: {
                        type: "object",
                        properties: {
                          url: { type: "string" },
                          method: { type: "string" },
                          headers: { type: "object" },
                          body: { type: "object" },
                          auth_type: { type: "string" },
                          retry_count: { type: "number" },
                          timeout_ms: { type: "number" },
                        },
                      },
                    },
                    required: ["id", "type", "title", "x", "y"],
                  },
                },
                connections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { from: { type: "string" }, to: { type: "string" } },
                    required: ["from", "to"],
                  },
                },
              },
              required: ["name", "description", "nodes", "connections"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_api_workflow" } },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI generation failed: ${status}`);
    }

    const aiData = await aiRes.json();
    let workflow: any;
    try {
      const args = aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      workflow = typeof args === "string" ? JSON.parse(args) : args;
    } catch {
      throw new Error("Failed to parse generated workflow");
    }

    // Inject guardrails
    const injected = injectGuardrailNodes(workflow.nodes || []);

    return new Response(
      JSON.stringify({
        workflow: {
          nodes: injected.nodes,
          connections: workflow.connections || [],
        },
        name: workflow.name,
        description: workflow.description,
        guardrails: {
          added: injected.guardrailsAdded,
          explanations: injected.explanations,
          compliance: injected.complianceStandards,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("API import error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
