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

    // Fetch recent execution data
    const { data: executions, error: execError } = await supabaseClient
      .from('workflow_executions')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('started_at', { ascending: false })
      .limit(100);

    if (execError) throw execError;

    // Analyze patterns using Lovable AI
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
          content: `Analyze these workflow executions and predict potential failures in the next 24 hours. Return predictions as JSON array with: prediction_type, confidence_score (0-1), predicted_for (ISO timestamp), details, preventive_actions array.

Executions: ${JSON.stringify(executions.slice(0, 50))}`
        }],
        tools: [{
          type: 'function',
          function: {
            name: 'predict_failures',
            description: 'Predict workflow failures',
            parameters: {
              type: 'object',
              properties: {
                predictions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      prediction_type: { type: 'string', enum: ['failure_risk', 'performance_degradation', 'cost_spike', 'scaling_need'] },
                      confidence_score: { type: 'number', minimum: 0, maximum: 1 },
                      predicted_for: { type: 'string' },
                      details: { type: 'object' },
                      preventive_actions: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['prediction_type', 'confidence_score', 'predicted_for', 'details', 'preventive_actions']
                  }
                }
              },
              required: ['predictions']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'predict_failures' } }
      })
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error('AI gateway error');
    }

    const aiData = await aiResponse.json();
    const predictionsArgs = JSON.parse(aiData.choices[0].message.tool_calls[0].function.arguments);
    
    // Store predictions
    const predictions = predictionsArgs.predictions.map((p: any) => ({
      workflow_id: workflowId,
      workspace_id: workspaceId,
      ...p
    }));

    const { error: insertError } = await supabaseClient
      .from('workflow_predictions')
      .insert(predictions);

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ predictions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Prediction error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});