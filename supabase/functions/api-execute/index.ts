import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

async function verifyApiKey(supabase: any, apiKey: string) {
  if (!apiKey) return null;

  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const key_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const { data: keyData, error } = await supabase
    .from('api_keys')
    .select('*, workspace_id')
    .eq('key_hash', key_hash)
    .eq('is_active', true)
    .single();

  if (error || !keyData) return null;
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) return null;

  const { data: allowed } = await supabase.rpc('check_api_rate_limit', {
    _api_key_id: keyData.id,
    _limit: 1000,
    _window_minutes: 60
  });

  if (!allowed) throw new Error('RATE_LIMIT_EXCEEDED');

  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyData.id);

  return { key_id: keyData.id, workspace_id: keyData.workspace_id };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const apiKey = req.headers.get('X-API-Key');
    let auth;
    
    try {
      auth = await verifyApiKey(supabase, apiKey || '');
    } catch (error: any) {
      if (error.message === 'RATE_LIMIT_EXCEEDED') {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw error;
    }

    if (!auth) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { workflow_id, input_data = {} } = await req.json();

    if (!workflow_id) {
      return new Response(JSON.stringify({ error: 'workflow_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify workflow exists and belongs to workspace
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflow_id)
      .eq('workspace_id', auth.workspace_id)
      .single();

    if (workflowError || !workflow) {
      return new Response(JSON.stringify({ error: 'Workflow not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create execution record
    const { data: execution, error: execError } = await supabase
      .from('workflow_executions')
      .insert({
        workflow_id,
        workspace_id: auth.workspace_id,
        status: 'running',
        execution_data: input_data,
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (execError) throw execError;

    // Simulate workflow execution (in real implementation, this would trigger actual execution)
    // For now, we'll mark it as completed immediately
    const { data: completedExecution, error: updateError } = await supabase
      .from('workflow_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_ms: 100,
        execution_data: {
          ...input_data,
          result: 'Workflow executed successfully via API'
        }
      })
      .eq('id', execution.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log API usage
    await supabase.from('api_usage').insert({
      api_key_id: auth.key_id,
      endpoint: '/api/execute',
      method: 'POST',
      status_code: 200,
      response_time_ms: 100
    });

    return new Response(JSON.stringify({ 
      data: completedExecution,
      message: 'Workflow execution started'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('API execute error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
