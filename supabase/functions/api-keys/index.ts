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
    // User-context client for auth + user-scoped queries
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Service-role client for admin operations (workspace + key creation)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET - List API keys
    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('api_keys')
        .select('id, name, key_prefix, scopes, last_used_at, expires_at, created_at, is_active, workspace_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST - Create new API key
    if (req.method === 'POST') {
      const { name, scopes = [], expires_in_days } = await req.json();

      if (!name?.trim()) {
        return new Response(JSON.stringify({ error: 'Name is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Auto-create dedicated workspace for each API key
      const slugBase = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 32) || 'api-key-workspace';
      const uniqueSuffix = crypto.randomUUID().slice(0, 8);
      const workspaceSlug = `${slugBase}-${uniqueSuffix}`;

      const { data: workspace, error: workspaceError } = await supabaseAdmin
        .from('workspaces')
        .insert({
          name: `${name.trim()} Workspace`,
          slug: workspaceSlug,
          owner_id: user.id,
        })
        .select('id')
        .single();

      if (workspaceError || !workspace) {
        throw new Error(workspaceError?.message || 'Failed to create workspace for API key');
      }

      const workspace_id = workspace.id;

      // Generate API key without DB dependency
      const apiKey = `wfapi_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

      // Hash the key for storage
      const encoder = new TextEncoder();
      const encodedKey = encoder.encode(apiKey);
      const hashBuffer = await crypto.subtle.digest('SHA-256', encodedKey);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const key_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      const key_prefix = `${apiKey.slice(0, 12)}...`;

      // Calculate expiration
      const parsedExpiresDays = Number(expires_in_days);
      const hasExpiration = Number.isFinite(parsedExpiresDays) && parsedExpiresDays > 0;
      const expires_at = hasExpiration
        ? new Date(Date.now() + parsedExpiresDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Store key
      const { data: newKey, error } = await supabaseAdmin
        .from('api_keys')
        .insert({
          workspace_id,
          user_id: user.id,
          key_hash,
          key_prefix,
          name,
          scopes,
          expires_at,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ 
        data: newKey,
        api_key: apiKey, // Only returned once!
        warning: 'Save this key - it will not be shown again'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE - Revoke API key
    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const keyId = url.pathname.split('/').pop();

      if (!keyId) {
        return new Response(JSON.stringify({ error: 'Key ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabaseAdmin
        .from('api_keys')
        .update({ is_active: false })
        .eq('id', keyId)
        .eq('user_id', user.id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('API keys error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
