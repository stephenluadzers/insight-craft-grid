import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";
import { injectGuardrailNodes } from "../_shared/guardrails.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, publishToMarketplace, price_cents, tags } = await req.json();
    if (!prompt?.trim()) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Optional auth for marketplace publishing
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const { data } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = data.user?.id ?? null;
    }

    console.log("=== AI Workflow Pipeline Started ===");

    // --- STEP 1: Generate workflow from prompt ---
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
        messages: [
          { role: "system", content: "You are an expert workflow architect. Create production-ready workflows with proper triggers, error handling, and clear node flow. Target 5-15 nodes. Every workflow must start with a trigger node." },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!generateRes.ok) {
      const status = generateRes.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

    // --- STEP 2: Optimize with AI ---
    console.log("Step 2: Optimizing workflow...");
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

    console.log("Step 2 complete:", optimized.nodes?.length, "nodes after optimization");

    // --- STEP 3: Inject guardrails ---
    const injected = injectGuardrailNodes(optimized.nodes);
    optimized.nodes = injected.nodes;

    // --- STEP 4: Build export package ---
    const exportPackage = {
      name: workflow.name || "AI Generated Workflow",
      description: workflow.description || prompt,
      version: "1.0.0",
      generatedAt: new Date().toISOString(),
      originalPrompt: prompt,
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
      }
    };

    // --- STEP 5: Optionally publish to marketplace ---
    let marketplaceResult = null;
    if (publishToMarketplace && userId) {
      console.log("Step 5: Publishing to marketplace...");

      // Get user's workspace
      const { data: profile } = await supabase
        .from("profiles")
        .select("default_workspace_id")
        .eq("id", userId)
        .single();

      if (profile?.default_workspace_id) {
        // Create workflow template
        const { data: template, error: templateErr } = await supabase
          .from("workflow_templates")
          .insert({
            name: exportPackage.name,
            description: exportPackage.description,
            workflow_data: exportPackage.workflow,
            category: "ai-generated",
            tags: tags || ["ai-generated", "optimized"],
            created_by: userId,
            workspace_id: profile.default_workspace_id,
            is_public: false,
            approval_status: "pending",
          })
          .select("id")
          .single();

        if (!templateErr && template) {
          // Create marketplace listing
          const { data: listing, error: listingErr } = await supabase
            .from("marketplace_templates")
            .insert({
              template_id: template.id,
              creator_id: userId,
              price_cents: price_cents || 0,
              tags: tags || ["ai-generated"],
              featured: false,
              is_verified: false,
            })
            .select("id")
            .single();

          marketplaceResult = {
            templateId: template.id,
            listingId: listing?.id,
            status: listingErr ? "template_created" : "listed",
            message: listingErr
              ? "Workflow saved as template. Marketplace listing requires approval."
              : "Workflow listed on marketplace (pending approval).",
          };
        }
      }
    }

    console.log("=== AI Workflow Pipeline Complete ===");

    return new Response(
      JSON.stringify({ ...exportPackage, marketplace: marketplaceResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Pipeline error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
