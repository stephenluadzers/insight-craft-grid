import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// Verify API key and return workspace_id
async function verifyApiKey(supabase: any, apiKey: string) {
  if (!apiKey) return null;

  // Hash the provided key
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const key_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Find key
  const { data: keyData, error } = await supabase
    .from('api_keys')
    .select('*, workspace_id')
    .eq('key_hash', key_hash)
    .eq('is_active', true)
    .single();

  if (error || !keyData) return null;

  // Check expiration
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    return null;
  }

  // Check rate limit
  const { data: allowed } = await supabase.rpc('check_api_rate_limit', {
    _api_key_id: keyData.id,
    _limit: 1000,
    _window_minutes: 60
  });

  if (!allowed) {
    throw new Error('RATE_LIMIT_EXCEEDED');
  }

  // Update last used
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

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get API key from header
    const apiKey = req.headers.get('X-API-Key');
    let auth;
    
    try {
      auth = await verifyApiKey(supabase, apiKey || '');
    } catch (error: any) {
      if (error.message === 'RATE_LIMIT_EXCEEDED') {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw error;
    }

    if (!auth) {
      return new Response(JSON.stringify({ error: 'Invalid or expired API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(p => p);
    // Strip the function name itself ("api-workflows") so only sub-route segments remain
    const fnIdx = pathParts.indexOf('api-workflows');
    const subParts = fnIdx >= 0 ? pathParts.slice(fnIdx + 1) : pathParts;
    const lastPart = subParts[subParts.length - 1];
    const isSubAction = lastPart === 'generate' || lastPart === 'import';
    const workflowId = !lastPart || isSubAction ? undefined : lastPart;

    // Log usage
    const logUsage = async (statusCode: number) => {
      await supabase.from('api_usage').insert({
        api_key_id: auth.key_id,
        endpoint: url.pathname,
        method: req.method,
        status_code: statusCode,
        response_time_ms: Date.now() - startTime
      });
    };

    // Helper: get owner user_id for the workspace (for workflow inserts)
    const getOwnerUserId = async () => {
      const { data: member } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', auth.workspace_id)
        .eq('role', 'owner')
        .single();
      return member?.user_id;
    };

    // POST /workflows/generate - Generate a workflow from a natural-language prompt
    if (req.method === 'POST' && lastPart === 'generate') {
      const body = await req.json().catch(() => ({}));
      const { prompt, description, name, save = true } = body;
      const promptText = prompt || description;

      if (!promptText || typeof promptText !== 'string') {
        await logUsage(400);
        return new Response(JSON.stringify({ error: '`prompt` (string) is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Invoke the existing generator
      const { data: gen, error: genErr } = await supabase.functions.invoke(
        'generate-workflow-from-text',
        { body: { description: promptText } }
      );
      if (genErr) {
        await logUsage(502);
        return new Response(JSON.stringify({ error: 'Generation failed', details: genErr.message }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const workflow = gen?.workflow || gen;
      if (!save) {
        await logUsage(200);
        return new Response(JSON.stringify({ data: { workflow } }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const user_id = await getOwnerUserId();
      const { data: saved, error: saveErr } = await supabase
        .from('workflows')
        .insert({
          workspace_id: auth.workspace_id,
          user_id,
          name: name || workflow?.name || 'Generated Workflow',
          description: promptText.slice(0, 500),
          nodes: workflow?.nodes ?? [],
          connections: workflow?.connections ?? workflow?.edges ?? [],
          status: 'draft',
        })
        .select()
        .single();

      if (saveErr) {
        await logUsage(500);
        return new Response(JSON.stringify({ error: saveErr.message, workflow }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await logUsage(201);
      return new Response(JSON.stringify({ data: saved, workflow }), {
        status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /workflows/import - Import a Remora JSON workflow into the catalog
    if (req.method === 'POST' && lastPart === 'import') {
      const body = await req.json().catch(() => ({}));
      const { workflow, name, skipSpecify } = body;

      if (!workflow || !Array.isArray(workflow.nodes)) {
        await logUsage(400);
        return new Response(JSON.stringify({ error: 'Invalid `workflow`: must include `nodes` array' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Run through the existing import pipeline (Jerry Specify + guardrails)
      const { data: imp, error: impErr } = await supabase.functions.invoke(
        'import-workflow-json',
        { body: { workflow, skipSpecify } }
      );
      if (impErr) {
        await logUsage(502);
        return new Response(JSON.stringify({ error: 'Import pipeline failed', details: impErr.message }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const processed = imp?.workflow || workflow;
      const user_id = await getOwnerUserId();

      const { data: saved, error: saveErr } = await supabase
        .from('workflows')
        .insert({
          workspace_id: auth.workspace_id,
          user_id,
          name: name || processed?.name || workflow?.name || 'Imported Workflow',
          description: processed?.description || workflow?.description || null,
          nodes: processed?.nodes ?? [],
          connections: processed?.connections ?? processed?.edges ?? [],
          status: 'draft',
        })
        .select()
        .single();

      if (saveErr) {
        await logUsage(500);
        return new Response(JSON.stringify({ error: saveErr.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await logUsage(201);
      return new Response(JSON.stringify({
        data: saved,
        specifyChanges: imp?.specifyChanges ?? [],
        placeholders: imp?.placeholders ?? [],
        autoResolved: imp?.autoResolved ?? [],
        requiredEnv: imp?.requiredEnv ?? [],
      }), {
        status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    // GET /workflows - List workflows (paginated)
    if (req.method === 'GET' && !workflowId) {
      const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '100', 10) || 100, 1), 500);
      const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);

      const { data, error, count } = await supabase
        .from('workflows')
        .select('*', { count: 'exact' })
        .eq('workspace_id', auth.workspace_id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      await logUsage(200);

      return new Response(JSON.stringify({ data, total: count ?? data.length, limit, offset }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /workflows/:id - Get single workflow
    if (req.method === 'GET' && workflowId) {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .eq('workspace_id', auth.workspace_id)
        .single();

      if (error) throw error;
      await logUsage(200);

      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /workflows - Create workflow
    if (req.method === 'POST') {
      const body = await req.json();
      const { name, description, nodes = [], connections = [] } = body;

      if (!name) {
        await logUsage(400);
        return new Response(JSON.stringify({ error: 'Name is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get user_id from first workspace member (for compatibility)
      const { data: member } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', auth.workspace_id)
        .eq('role', 'owner')
        .single();

      const { data, error } = await supabase
        .from('workflows')
        .insert({
          workspace_id: auth.workspace_id,
          user_id: member?.user_id,
          name,
          description,
          nodes,
          connections,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;
      await logUsage(201);

      return new Response(JSON.stringify({ data }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUT /workflows/:id - Update workflow
    if (req.method === 'PUT' && workflowId) {
      const body = await req.json();
      const { name, description, nodes, connections, status } = body;

      const updateData: any = {};
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (nodes) updateData.nodes = nodes;
      if (connections) updateData.connections = connections;
      if (status) updateData.status = status;

      const { data, error } = await supabase
        .from('workflows')
        .update(updateData)
        .eq('id', workflowId)
        .eq('workspace_id', auth.workspace_id)
        .select()
        .single();

      if (error) throw error;
      await logUsage(200);

      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE /workflows/:id - Delete workflow
    if (req.method === 'DELETE' && workflowId) {
      const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', workflowId)
        .eq('workspace_id', auth.workspace_id);

      if (error) throw error;
      await logUsage(204);

      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    await logUsage(405);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('API workflows error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
