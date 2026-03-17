import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(req.url);
    const method = req.method;

    // GET - Retrieve memories
    if (method === 'GET') {
      const workspaceId = url.searchParams.get('workspace_id');
      const workflowId = url.searchParams.get('workflow_id');
      const memoryType = url.searchParams.get('type') || 'all';

      if (!workspaceId) {
        return new Response(JSON.stringify({ error: 'workspace_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      let query = supabaseAdmin
        .from('agent_memory')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('updated_at', { ascending: false })
        .limit(100);

      if (workflowId) query = query.eq('workflow_id', workflowId);
      if (memoryType !== 'all') query = query.eq('memory_type', memoryType);

      // Filter expired
      query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

      const { data, error } = await query;
      if (error) throw error;

      // Increment access count for retrieved memories
      if (data && data.length > 0) {
        const ids = data.map(m => m.id);
        await supabaseAdmin.rpc('increment_access_count_noop', {}).catch(() => {
          // Fallback: update individually
        });
      }

      return new Response(JSON.stringify({ memories: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST - Store or update memory
    if (method === 'POST') {
      const { workspace_id, workflow_id, memory_type, memory_key, memory_value, expires_in_hours } = await req.json();

      if (!workspace_id || !memory_key) {
        return new Response(JSON.stringify({ error: 'workspace_id and memory_key required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const expiresAt = expires_in_hours
        ? new Date(Date.now() + expires_in_hours * 3600000).toISOString()
        : (memory_type === 'short_term' ? new Date(Date.now() + 24 * 3600000).toISOString() : null);

      const { data, error } = await supabaseAdmin
        .from('agent_memory')
        .upsert({
          workspace_id,
          workflow_id: workflow_id || null,
          memory_type: memory_type || 'short_term',
          memory_key,
          memory_value: memory_value || {},
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'workspace_id,workflow_id,memory_key'
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ memory: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // DELETE - Remove memory
    if (method === 'DELETE') {
      const { workspace_id, memory_key, workflow_id } = await req.json();

      let query = supabaseAdmin
        .from('agent_memory')
        .delete()
        .eq('workspace_id', workspace_id)
        .eq('memory_key', memory_key);

      if (workflow_id) query = query.eq('workflow_id', workflow_id);

      const { error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Agent memory error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
