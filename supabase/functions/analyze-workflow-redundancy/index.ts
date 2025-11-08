import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { workspaceId } = await req.json();

    // Fetch all workflows in workspace
    const { data: workflows, error: wfError } = await supabaseClient
      .from('workflows')
      .select('id, name, description, nodes, connections')
      .eq('workspace_id', workspaceId);

    if (wfError) throw wfError;

    // Get cost data
    const { data: costData } = await supabaseClient
      .from('workflow_cost_tracking')
      .select('workflow_id, cost_amount_cents')
      .eq('workspace_id', workspaceId)
      .gte('recorded_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: `Analyze these workflows for redundancy, duplication, and consolidation opportunities:

Workflows: ${JSON.stringify(workflows)}
Cost Data: ${JSON.stringify(costData)}

Find duplicate or similar workflows that could be consolidated to save costs.`
        }],
        tools: [{
          type: 'function',
          function: {
            name: 'identify_redundancy',
            description: 'Identify redundant workflows',
            parameters: {
              type: 'object',
              properties: {
                redundancies: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      workflow_ids: { type: 'array', items: { type: 'string' } },
                      redundancy_type: { type: 'string', enum: ['duplicate', 'similar', 'overlapping'] },
                      similarity_score: { type: 'number', minimum: 0, maximum: 1 },
                      cost_waste_cents: { type: 'integer' },
                      consolidation_plan: { type: 'object' }
                    },
                    required: ['workflow_ids', 'redundancy_type', 'similarity_score', 'consolidation_plan']
                  }
                }
              },
              required: ['redundancies']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'identify_redundancy' } }
      })
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error('AI gateway error');
    }

    const aiData = await aiResponse.json();
    const analysis = JSON.parse(aiData.choices[0].message.tool_calls[0].function.arguments);

    // Store redundancy findings
    const redundancies = analysis.redundancies.map((r: any) => ({
      workspace_id: workspaceId,
      workflow_ids: r.workflow_ids,
      redundancy_type: r.redundancy_type,
      similarity_score: r.similarity_score,
      cost_waste_cents: r.cost_waste_cents || 0,
      suggested_consolidation: r.consolidation_plan
    }));

    if (redundancies.length > 0) {
      await supabaseClient.from('workflow_redundancy_analysis').insert(redundancies);
    }

    return new Response(JSON.stringify({ redundancies }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Redundancy analysis error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});