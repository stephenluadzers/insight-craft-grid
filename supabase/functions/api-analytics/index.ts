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

    const url = new URL(req.url);
    const workflow_id = url.searchParams.get('workflow_id');
    const days = parseInt(url.searchParams.get('days') || '7');

    // Get executions statistics
    const { data: executions, error: execError } = await supabase
      .from('workflow_executions')
      .select('id, status, duration_ms, started_at, workflow_id')
      .eq('workspace_id', auth.workspace_id)
      .gte('started_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .then(({ data, error }) => {
        if (workflow_id && data) {
          return { data: data.filter((e: any) => e.workflow_id === workflow_id), error };
        }
        return { data, error };
      });

    if (execError) throw execError;

    // Calculate metrics
    const total = executions?.length || 0;
    const completed = executions?.filter((e: any) => e.status === 'completed').length || 0;
    const failed = executions?.filter((e: any) => e.status === 'failed').length || 0;
    const avgDuration = (executions?.reduce((sum: number, e: any) => sum + (e.duration_ms || 0), 0) || 0) / (total || 1);

    // Get API usage stats
    const { data: apiUsage, error: usageError } = await supabase
      .from('api_usage')
      .select('endpoint, method, status_code, created_at')
      .eq('api_key_id', auth.key_id)
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

    if (usageError) throw usageError;

    const analytics = {
      period_days: days,
      workflow_id: workflow_id || 'all',
      executions: {
        total,
        completed,
        failed,
        success_rate: total > 0 ? (completed / total * 100).toFixed(2) + '%' : '0%',
        avg_duration_ms: Math.round(avgDuration)
      },
      api_usage: {
        total_requests: apiUsage?.length || 0,
        requests_by_endpoint: apiUsage?.reduce((acc: any, req: any) => {
          const key = `${req.method} ${req.endpoint}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {})
      }
    };

    // Log this request
    await supabase.from('api_usage').insert({
      api_key_id: auth.key_id,
      endpoint: '/api/analytics',
      method: 'GET',
      status_code: 200,
      response_time_ms: 50
    });

    return new Response(JSON.stringify({ data: analytics }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('API analytics error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
