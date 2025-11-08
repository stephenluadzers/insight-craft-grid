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

    const { command, workspaceId } = await req.json();
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Get workspace workflows for context
    const { data: workflows } = await supabaseClient
      .from('workflows')
      .select('id, name, description, nodes')
      .eq('workspace_id', workspaceId)
      .limit(50);

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
          content: `User command: "${command}"

Available workflows: ${JSON.stringify(workflows?.map(w => ({ id: w.id, name: w.name, description: w.description })))}

Interpret this command and determine: command_type (query/action/create/modify), workflow_ids (if applicable), action_to_execute, parameters.`
        }],
        tools: [{
          type: 'function',
          function: {
            name: 'interpret_command',
            description: 'Interpret natural language workflow command',
            parameters: {
              type: 'object',
              properties: {
                command_type: { type: 'string', enum: ['query', 'action', 'create', 'modify'] },
                workflow_ids: { type: 'array', items: { type: 'string' } },
                action: { type: 'string' },
                parameters: { type: 'object' },
                sql_query: { type: 'string' }
              },
              required: ['command_type', 'action']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'interpret_command' } }
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
    const interpretation = JSON.parse(aiData.choices[0].message.tool_calls[0].function.arguments);

    // Execute based on interpretation
    let result = null;
    let executionStatus = 'success';

    try {
      if (interpretation.command_type === 'query' && interpretation.sql_query) {
        // Execute read-only query
        const { data, error } = await supabaseClient.rpc('execute_safe_query', {
          query_text: interpretation.sql_query
        });
        result = data;
        if (error) {
          executionStatus = 'failed';
          result = { error: error.message };
        }
      } else if (interpretation.command_type === 'action') {
        // Execute workflow action
        result = { message: `Action "${interpretation.action}" prepared`, interpretation };
      }
    } catch (error) {
      executionStatus = 'failed';
      result = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    // Log command
    await supabaseClient.from('workflow_nl_commands').insert({
      workspace_id: workspaceId,
      user_id: user.id,
      command_text: command,
      command_type: interpretation.command_type,
      interpretation,
      workflow_ids: interpretation.workflow_ids || [],
      execution_status: executionStatus,
      result
    });

    return new Response(JSON.stringify({ interpretation, result, status: executionStatus }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('NL command error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});