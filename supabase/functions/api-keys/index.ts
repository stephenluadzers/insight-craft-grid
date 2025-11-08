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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
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
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, name, key_prefix, scopes, last_used_at, expires_at, created_at, is_active, workspace_id')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST - Create new API key
    if (req.method === 'POST') {
      const { name, scopes = [], expires_in_days, workspace_id } = await req.json();

      if (!name || !workspace_id) {
        return new Response(JSON.stringify({ error: 'Name and workspace_id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if user is admin/owner of workspace
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspace_id)
        .eq('user_id', user.id)
        .single();

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Generate API key
      const { data: keyData } = await supabase.rpc('generate_api_key');
      const apiKey = keyData as string;

      // Hash the key for storage
      const encoder = new TextEncoder();
      const data = encoder.encode(apiKey);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const key_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      const key_prefix = apiKey.substring(0, 12) + '...';

      // Calculate expiration
      const expires_at = expires_in_days 
        ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Store key
      const { data: newKey, error } = await supabase
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

      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('id', keyId);

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
