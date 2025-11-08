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

    const { workflowId, workspaceId } = await req.json();

    const { data: workflow } = await supabaseClient
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (!workflow) throw new Error('Workflow not found');

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
          content: `Analyze this workflow and suggest better integrations or native connectors:

Workflow: ${JSON.stringify(workflow)}

Look for manual API calls that could use native integrations, inefficient data transformations, or opportunities for pre-built connectors.`
        }],
        tools: [{
          type: 'function',
          function: {
            name: 'suggest_integrations',
            description: 'Suggest better workflow integrations',
            parameters: {
              type: 'object',
              properties: {
                suggestions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      integration_name: { type: 'string' },
                      category: { type: 'string' },
                      current_approach: { type: 'string' },
                      estimated_savings_cents: { type: 'integer' },
                      estimated_time_savings_hours: { type: 'number' },
                      confidence: { type: 'number', minimum: 0, maximum: 1 },
                      complexity: { type: 'string', enum: ['low', 'medium', 'high'] },
                      reason: { type: 'string' }
                    },
                    required: ['integration_name', 'category', 'current_approach', 'confidence', 'complexity', 'reason']
                  }
                }
              },
              required: ['suggestions']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'suggest_integrations' } }
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

    const suggestions = analysis.suggestions.map((s: any) => ({
      workflow_id: workflowId,
      workspace_id: workspaceId,
      suggested_integration: s.integration_name,
      integration_category: s.category,
      current_approach: s.current_approach,
      estimated_savings_cents: s.estimated_savings_cents,
      estimated_time_savings_hours: s.estimated_time_savings_hours,
      confidence_score: s.confidence,
      implementation_complexity: s.complexity
    }));

    if (suggestions.length > 0) {
      await supabaseClient.from('workflow_integration_suggestions').insert(suggestions);
    }

    return new Response(JSON.stringify({ suggestions: analysis.suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Integration suggestion error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});