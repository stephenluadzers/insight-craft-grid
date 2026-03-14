import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { injectGuardrailNodes } from "../_shared/guardrails.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-agent-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate via agent key header or Authorization bearer
    let agentKey = req.headers.get("x-agent-key");
    if (!agentKey) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        agentKey = authHeader.replace("Bearer ", "");
      }
    }

    if (!agentKey) {
      return new Response(
        JSON.stringify({ error: "Authentication required. Provide X-Agent-Key header or Bearer token." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate agent key against API keys table
    const { data: apiKey, error: keyError } = await supabase
      .from("api_keys")
      .select("id, user_id, workspace_id, scopes, is_active")
      .eq("key_hash", agentKey)
      .eq("is_active", true)
      .single();

    if (keyError || !apiKey) {
      return new Response(
        JSON.stringify({ error: "Invalid or inactive agent key." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the request body
    const body = await req.json();
    const {
      prompt,                  // Text description of desired workflow
      image_url,               // URL to an image (screenshot, diagram, etc.)
      image_base64,            // Base64-encoded image
      workflow_json,           // Existing workflow JSON to improve
      input_type = "auto",     // "text" | "image" | "workflow" | "auto"
      publish = false,         // Auto-publish to marketplace
      price_cents = 0,
      tags = [],
      export_format = "json",  // "json" | "yaml" | "both"
    } = body;

    // Validate at least one input is provided
    if (!prompt && !image_url && !image_base64 && !workflow_json) {
      return new Response(
        JSON.stringify({ 
          error: "At least one input required: prompt, image_url, image_base64, or workflow_json",
          usage: {
            prompt: "Text description of the workflow to create",
            image_url: "URL to a workflow diagram or screenshot",
            image_base64: "Base64-encoded image of a workflow",
            workflow_json: "Existing workflow JSON to optimize",
            publish: "Boolean - auto-publish to marketplace",
            price_cents: "Price in cents for marketplace listing",
            tags: "Array of tags for the workflow",
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("=== Agent Webhook Pipeline Started ===");
    console.log("Input type:", input_type, "| Has prompt:", !!prompt, "| Has image:", !!(image_url || image_base64), "| Has workflow:", !!workflow_json);

    // --- STEP 1: Build the AI prompt from all inputs ---
    let combinedPrompt = "";
    const messages: any[] = [];

    // If an existing workflow is provided, use it as context
    if (workflow_json) {
      combinedPrompt += `Existing workflow to improve:\n${JSON.stringify(workflow_json, null, 2)}\n\n`;
    }

    if (prompt) {
      combinedPrompt += prompt;
    }

    // Build messages array for AI - support multimodal (images)
    if (image_url || image_base64) {
      const imageContent: any[] = [];
      
      if (combinedPrompt) {
        imageContent.push({ type: "text", text: combinedPrompt || "Analyze this image and create a workflow based on what you see. If it's a workflow diagram, recreate it. If it's a screenshot of a process, automate that process." });
      }
      
      if (image_url) {
        imageContent.push({ type: "image_url", image_url: { url: image_url } });
      } else if (image_base64) {
        imageContent.push({ type: "image_url", image_url: { url: `data:image/png;base64,${image_base64}` } });
      }

      messages.push({
        role: "system",
        content: "You are an expert workflow architect. Analyze any provided images (workflow diagrams, process screenshots, UI mockups) and create production-ready automation workflows. Every workflow must start with a trigger node. Target 5-15 nodes with proper error handling."
      });
      messages.push({ role: "user", content: imageContent });
    } else {
      messages.push({
        role: "system",
        content: "You are an expert workflow architect. Create production-ready workflows with proper triggers, error handling, and clear node flow. Target 5-15 nodes. Every workflow must start with a trigger node."
      });
      messages.push({ role: "user", content: combinedPrompt });
    }

    // --- STEP 2: Generate workflow ---
    console.log("Step 1: Generating workflow...");
    const generateRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.15,
        tools: [{
          type: "function",
          function: {
            name: "create_workflow",
            description: "Create a complete workflow with nodes and connections",
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
                      config: { type: "object" }
                    },
                    required: ["id", "type", "title", "x", "y"]
                  }
                },
                connections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { from: { type: "string" }, to: { type: "string" } },
                    required: ["from", "to"]
                  }
                }
              },
              required: ["name", "description", "nodes", "connections"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "create_workflow" } },
        messages,
      })
    });

    if (!generateRes.ok) {
      const status = generateRes.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`Generate failed: ${status}`);
    }

    const genData = await generateRes.json();
    let workflow: any;
    try {
      const args = genData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      workflow = typeof args === "string" ? JSON.parse(args) : args;
    } catch {
      throw new Error("Failed to parse generated workflow");
    }

    console.log("Step 1 complete:", workflow.nodes?.length, "nodes");

    // --- STEP 3: Optimize ---
    console.log("Step 2: Optimizing...");
    const optimizeRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.1,
        tools: [{
          type: "function",
          function: {
            name: "optimize_workflow",
            description: "Return the optimized workflow with suggestions",
            parameters: {
              type: "object",
              properties: {
                optimizedNodes: { type: "array", items: { type: "object" } },
                optimizedConnections: { type: "array", items: { type: "object" } },
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["performance", "security", "reliability", "ux"] },
                      title: { type: "string" },
                      description: { type: "string" },
                      impact: { type: "string", enum: ["high", "medium", "low"] }
                    },
                    required: ["type", "title", "description", "impact"]
                  }
                },
                optimizationSummary: { type: "string" }
              },
              required: ["optimizedNodes", "optimizedConnections", "suggestions", "optimizationSummary"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "optimize_workflow" } },
        messages: [
          { role: "system", content: "You are a workflow optimization expert. Improve the workflow for performance, security, reliability, and UX. Add error handlers where needed. Add retries for external calls. Ensure data validation. Keep node IDs stable." },
          { role: "user", content: `Optimize this workflow:\n${JSON.stringify(workflow, null, 2)}` }
        ]
      })
    });

    let optimized = workflow;
    let suggestions: any[] = [];
    let optimizationSummary = "";

    if (optimizeRes.ok) {
      const optData = await optimizeRes.json();
      try {
        const args = optData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        const parsed = typeof args === "string" ? JSON.parse(args) : args;
        if (parsed.optimizedNodes?.length) {
          optimized = { ...workflow, nodes: parsed.optimizedNodes, connections: parsed.optimizedConnections || workflow.connections };
        }
        suggestions = parsed.suggestions || [];
        optimizationSummary = parsed.optimizationSummary || "";
      } catch { /* keep original */ }
    }

    console.log("Step 2 complete:", optimized.nodes?.length, "nodes");

    // --- STEP 4: Guardrails ---
    const injected = injectGuardrailNodes(optimized.nodes);
    optimized.nodes = injected.nodes;

    // --- STEP 5: Build export ---
    const exportPackage = {
      name: workflow.name || "AI Agent Workflow",
      description: workflow.description || prompt || "Generated by AI agent",
      version: "1.0.0",
      generatedAt: new Date().toISOString(),
      inputType: input_type,
      originalPrompt: prompt,
      hasImageInput: !!(image_url || image_base64),
      hasWorkflowInput: !!workflow_json,
      optimizationSummary,
      workflow: {
        nodes: optimized.nodes,
        connections: optimized.connections || workflow.connections || [],
      },
      suggestions,
      guardrails: {
        added: injected.guardrailsAdded,
        explanations: injected.explanations,
        compliance: injected.complianceStandards,
      },
      metadata: {
        nodeCount: optimized.nodes.length,
        hasErrorHandling: optimized.nodes.some((n: any) => n.type === "error_handler"),
        hasGuardrails: injected.guardrailsAdded > 0,
        agentKeyId: apiKey.id,
      }
    };

    // --- STEP 6: Publish to marketplace if requested ---
    let marketplaceResult = null;
    if (publish) {
      console.log("Step 5: Publishing to marketplace...");
      const { data: template, error: templateErr } = await supabase
        .from("workflow_templates")
        .insert({
          name: exportPackage.name,
          description: exportPackage.description,
          workflow_data: exportPackage.workflow,
          category: "ai-agent-generated",
          tags: tags.length ? tags : ["ai-generated", "agent-created"],
          created_by: apiKey.user_id,
          workspace_id: apiKey.workspace_id,
          is_public: false,
          approval_status: "pending",
        })
        .select("id")
        .single();

      if (!templateErr && template) {
        const { data: listing, error: listingErr } = await supabase
          .from("marketplace_templates")
          .insert({
            template_id: template.id,
            creator_id: apiKey.user_id,
            price_cents: price_cents || 0,
            tags: tags.length ? tags : ["ai-generated"],
            featured: false,
            is_verified: false,
          })
          .select("id")
          .single();

        marketplaceResult = {
          templateId: template.id,
          listingId: listing?.id,
          status: listingErr ? "template_created" : "listed",
        };
      }
    }

    // Log the webhook usage
    await supabase.from("api_usage").insert({
      api_key_id: apiKey.id,
      endpoint: "/agent-webhook",
      method: req.method,
      status_code: 200,
    });

    console.log("=== Agent Webhook Pipeline Complete ===");

    return new Response(
      JSON.stringify({ success: true, ...exportPackage, marketplace: marketplaceResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Agent webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
