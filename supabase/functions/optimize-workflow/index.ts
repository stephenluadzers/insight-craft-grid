import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { injectGuardrailNodes, GUARDRAIL_SYSTEM_PROMPT } from "../_shared/guardrails.ts";
import { ROLE_CONTRACT_SYSTEM_PROMPT } from "../_shared/role-contracts.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🚀 optimize-workflow function called');
  console.log('📥 Request method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('📦 Request body:', JSON.stringify(requestBody, null, 2));
    
    const { workflow, userContext } = requestBody;
    
    // Input validation
    if (!workflow) {
      return new Response(
        JSON.stringify({ error: 'No workflow provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      return new Response(
        JSON.stringify({ error: 'Invalid workflow structure' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (workflow.nodes.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Workflow exceeds maximum of 100 nodes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    console.log('🔑 API Key check:', LOVABLE_API_KEY ? 'Present' : 'MISSING');
    
    if (!LOVABLE_API_KEY) {
      console.error('❌ LOVABLE_API_KEY not configured');
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('🤖 Optimizing workflow with AI Genius...');
    console.log('📊 Nodes to optimize:', workflow.nodes?.length || 0);

    // Use Gemini 2.5 Flash with tool-calling for guaranteed structured JSON
    console.log('🌐 Calling Lovable AI Gateway (tool-calling mode)...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 110_000);

    let response: Response;
    try {
      response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: `You are a workflow optimization expert. Analyze workflows and propose focused improvements.

${GUARDRAIL_SYSTEM_PROMPT}

${ROLE_CONTRACT_SYSTEM_PROMPT}

CRITICAL OUTPUT RULES — violating these makes your response unusable:
1. Return the EXACT SAME nodes that were given to you, preserving every "id" verbatim.
2. DO NOT add new nodes. DO NOT remove nodes. DO NOT split or duplicate nodes.
3. You may only edit a node's "description" or "config" — never invent placeholder nodes.
4. optimizedWorkflow.nodes.length MUST equal the input nodes.length.
5. Put all recommendations for new steps, refactors, or removals into "suggestions" as text — never materialize them as nodes.

Focus on: error handling/retries, missing critical steps, security, performance. Keep node descriptions brief.`,
            },
            {
              role: 'user',
              content: `Optimize this workflow:\n\n${JSON.stringify(workflow)}`,
            },
          ],
          tools: [
            {
              type: 'function',
              function: {
                name: 'return_optimization',
                description: 'Return the optimized workflow and suggestions.',
                parameters: {
                  type: 'object',
                  properties: {
                    optimizedWorkflow: {
                      type: 'object',
                      properties: {
                        nodes: { type: 'array', items: { type: 'object', additionalProperties: true } },
                      },
                      required: ['nodes'],
                      additionalProperties: true,
                    },
                    suggestions: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          type: { type: 'string', enum: ['performance', 'security', 'reliability', 'ux'] },
                          title: { type: 'string' },
                          description: { type: 'string' },
                          impact: { type: 'string', enum: ['high', 'medium', 'low'] },
                        },
                        required: ['type', 'title', 'description', 'impact'],
                      },
                    },
                  },
                  required: ['optimizedWorkflow', 'suggestions'],
                },
              },
            },
          ],
          tool_choice: { type: 'function', function: { name: 'return_optimization' } },
        }),
      });
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e?.name === 'AbortError') {
        return new Response(
          JSON.stringify({ error: 'Optimization timed out. Try fewer nodes or split the workflow.' }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw e;
    }
    clearTimeout(timeoutId);

    console.log('📡 AI Gateway response status:', response.status);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error('❌ No tool_call in AI response:', JSON.stringify(data).slice(0, 1000));
      throw new Error('AI did not return a structured optimization. Please try again.');
    }

    let optimizationData: any;
    try {
      optimizationData = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error('Failed to parse tool_call arguments:', e);
      console.error('Raw args (first 1k):', String(toolCall.function.arguments).slice(0, 1000));
      throw new Error('AI returned malformed structured output. Please try again.');
    }

    if (!optimizationData.optimizedWorkflow?.nodes || !Array.isArray(optimizationData.suggestions)) {
      throw new Error('AI response missing required fields.');
    }

    // ---- Sanity guard: the AI must not invent or drop nodes ----
    const inputNodes = workflow.nodes;
    const outNodes = optimizationData.optimizedWorkflow.nodes;
    const inputIds = new Set(inputNodes.map((n: any) => n.id));
    const isHollow = (n: any) =>
      !n || typeof n !== 'object' || !n.id ||
      (!n.type && !n.title && (!n.config || Object.keys(n.config).length === 0));
    const hollowCount = outNodes.filter(isHollow).length;
    const ballooned = outNodes.length > Math.max(inputNodes.length + 5, Math.ceil(inputNodes.length * 1.25));
    const idsDiverged = outNodes.filter((n: any) => n?.id && !inputIds.has(n.id)).length > Math.ceil(inputNodes.length * 0.25);

    if (ballooned || hollowCount > 0 || idsDiverged) {
      console.warn(
        `⚠️ Rejecting AI optimization — inputNodes=${inputNodes.length} outNodes=${outNodes.length} hollow=${hollowCount} idsDiverged=${idsDiverged}. Falling back to original nodes with suggestions only.`
      );
      optimizationData.optimizedWorkflow.nodes = inputNodes;
      optimizationData.warning =
        `The optimizer returned an invalid node set (${outNodes.length} nodes vs ${inputNodes.length} input). ` +
        `Kept your original workflow unchanged; review the suggestions list below instead.`;
    } else {
      // Merge AI edits onto originals by id so we never lose data the AI omitted.
      const byId: Record<string, any> = {};
      for (const n of outNodes) if (n?.id) byId[n.id] = n;
      optimizationData.optimizedWorkflow.nodes = inputNodes.map((orig: any) => {
        const edited = byId[orig.id];
        if (!edited) return orig;
        return {
          ...orig,
          description: edited.description ?? orig.description,
          config: { ...(orig.config || {}), ...(edited.config || {}) },
        };
      });
    }


    // Auto-inject guardrails + role contracts if missing
    const existingGuardrails = optimizationData.optimizedWorkflow.nodes.filter((n: any) => n.type === 'guardrail').length;
    if (existingGuardrails === 0) {
      const injectionResult = injectGuardrailNodes(optimizationData.optimizedWorkflow.nodes);
      optimizationData.optimizedWorkflow.nodes = injectionResult.nodes;
      optimizationData.guardrailExplanations = injectionResult.explanations;
      optimizationData.complianceStandards = injectionResult.complianceStandards;
      optimizationData.guardrailsAdded = injectionResult.guardrailsAdded;
      optimizationData.roleAssignments = injectionResult.roleAssignments;
      optimizationData.roleViolations = injectionResult.roleViolations;
      optimizationData.roleContractExplanation = injectionResult.roleContractExplanation;
      console.log('Guardrail nodes and role contracts auto-injected during optimization');
    }


    return new Response(
      JSON.stringify(optimizationData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in optimize-workflow:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
