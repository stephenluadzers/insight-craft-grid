/**
 * WORKFLOW DOCTOR — deep semantic + structural diagnosis
 *
 * Goes beyond structural auto-fix:
 *  - Detects logical issues (wrong order, missing steps, redundant nodes)
 *  - Detects semantic duplicates (two nodes doing the same thing)
 *  - Proposes a fixed workflow + a per-change diff the user can accept/reject
 *
 * Returns: {
 *   diagnosis: { summary, healthScore, issues[], suggestions[] },
 *   diff: { added[], removed[], modified[], reordered[], renamed[] },
 *   fixedWorkflow: { nodes[], connections[] }
 * }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the Remora Workflow Doctor — an elite AI auditor that diagnoses messy, broken, or illogical automation workflows and prescribes precise fixes.

You think like a senior automation architect. You don't just patch structure — you reason about INTENT.

## Your diagnostic framework (apply all 7):
1. **Structural integrity**: orphan nodes, missing triggers, broken connections, duplicate IDs, dead-ends, unreachable branches.
2. **Logical ordering**: are steps in a sequence that makes physical/causal sense? (e.g. "send confirmation email" must come AFTER "create order", not before).
3. **Missing prerequisites**: does a node reference data/state that was never produced? (e.g. emailing a user without fetching the user record first).
4. **Semantic redundancy**: are two+ nodes doing essentially the same thing? Propose merging.
5. **Error handling gaps**: external API calls, payments, integrations without retry/error_handler nodes.
6. **Guardrail/compliance gaps**: PII handling, auth checks, rate limits missing where they'd be expected.
7. **Conciseness**: nodes that add no value and can be removed without losing functionality.

## Output principles:
- Be specific. "Node X should come after Node Y because Y produces the user_id X needs" — not vague advice.
- Score health 0-100 honestly. A truly broken workflow scores 20. A polished one scores 90+.
- For each issue, attach severity: 'critical' | 'high' | 'medium' | 'low'.
- The fixedWorkflow you return MUST be a fully-valid, runnable version with all your fixes applied.
- Preserve user intent. Never invent business logic the user didn't imply.
- Keep node IDs stable where possible so the diff is meaningful.`;

const diagnoseSchema = {
  type: "function",
  function: {
    name: "diagnose_and_fix",
    description: "Produce a full diagnosis and a fixed workflow.",
    parameters: {
      type: "object",
      properties: {
        diagnosis: {
          type: "object",
          properties: {
            summary: { type: "string", description: "One-paragraph executive summary of workflow health" },
            healthScore: { type: "number", description: "0-100, honest assessment" },
            intent: { type: "string", description: "What the workflow appears to be trying to do" },
            issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                  category: { type: "string", enum: ["structural", "logical", "missing", "redundancy", "error_handling", "compliance", "conciseness"] },
                  title: { type: "string" },
                  description: { type: "string", description: "Specific explanation, naming the affected nodes" },
                  affectedNodeIds: { type: "array", items: { type: "string" } },
                  recommendation: { type: "string" },
                },
                required: ["id", "severity", "category", "title", "description", "recommendation"],
              },
            },
            suggestions: { type: "array", items: { type: "string" }, description: "Optional improvements beyond fixes" },
          },
          required: ["summary", "healthScore", "issues"],
        },
        diff: {
          type: "object",
          properties: {
            added: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nodeId: { type: "string" },
                  title: { type: "string" },
                  reason: { type: "string" },
                },
                required: ["nodeId", "title", "reason"],
              },
            },
            removed: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nodeId: { type: "string" },
                  title: { type: "string" },
                  reason: { type: "string" },
                },
                required: ["nodeId", "title", "reason"],
              },
            },
            modified: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nodeId: { type: "string" },
                  changes: { type: "string", description: "Human-readable summary of what changed" },
                  reason: { type: "string" },
                },
                required: ["nodeId", "changes", "reason"],
              },
            },
            reordered: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nodeId: { type: "string" },
                  reason: { type: "string" },
                },
                required: ["nodeId", "reason"],
              },
            },
            merged: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  intoNodeId: { type: "string" },
                  mergedNodeIds: { type: "array", items: { type: "string" } },
                  reason: { type: "string" },
                },
                required: ["intoNodeId", "mergedNodeIds", "reason"],
              },
            },
          },
        },
        fixedWorkflow: {
          type: "object",
          properties: {
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
                  config: { type: "object" },
                },
                required: ["id", "type", "title", "x", "y"],
              },
            },
            connections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  from: { type: "string" },
                  to: { type: "string" },
                  label: { type: "string" },
                },
                required: ["from", "to"],
              },
            },
          },
          required: ["nodes", "connections"],
        },
      },
      required: ["diagnosis", "diff", "fixedWorkflow"],
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { workflow, userContext } = await req.json();

    if (!workflow?.nodes || !Array.isArray(workflow.nodes)) {
      return new Response(
        JSON.stringify({ error: "workflow.nodes array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    console.log(`[diagnose-workflow] Auditing ${workflow.nodes.length} nodes`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 115_000);

    const userPrompt = `Diagnose this workflow and produce a fixed version.

${userContext ? `User context / goal:\n${userContext}\n\n` : ""}Current workflow (JSON):
${JSON.stringify({ nodes: workflow.nodes, connections: workflow.connections || [] }, null, 2)}

Apply the full 7-point diagnostic framework. Be ruthless but precise.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        temperature: 0.2,
        max_tokens: 8192,
        tools: [diagnoseSchema],
        tool_choice: { type: "function", function: { name: "diagnose_and_fix" } },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error("[diagnose-workflow] AI error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const rawArgs = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;

    let parsed: any;
    try {
      parsed = typeof rawArgs === "string" ? JSON.parse(rawArgs) : rawArgs;
    } catch (e) {
      const preview = typeof rawArgs === "string" ? rawArgs.substring(0, 500) : JSON.stringify(rawArgs).substring(0, 500);
      console.error("[diagnose-workflow] Parse error. Preview:", preview);
      throw new Error("AI returned unreadable diagnosis");
    }

    if (!parsed?.diagnosis || !parsed?.fixedWorkflow?.nodes) {
      throw new Error("AI diagnosis was incomplete");
    }

    console.log(`[diagnose-workflow] Health: ${parsed.diagnosis.healthScore}, issues: ${parsed.diagnosis.issues?.length || 0}`);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[diagnose-workflow] Error:", error);
    const msg = error.name === "AbortError" ? "Diagnosis timed out. Try with a smaller workflow." : error.message;
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
