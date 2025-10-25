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
    const { email, success } = await req.json();

    if (!email || typeof email !== 'string' || typeof success !== 'boolean') {
      return new Response(
        JSON.stringify({ error: 'Invalid request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (success) {
      // Clear attempts on successful login
      await supabase
        .from('auth_rate_limit')
        .delete()
        .eq('email', email);

      return new Response(
        JSON.stringify({ message: 'Login attempt recorded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record failed attempt
    const { data: existing } = await supabase
      .from('auth_rate_limit')
      .select('*')
      .eq('email', email)
      .single();

    const now = new Date();

    if (existing) {
      await supabase
        .from('auth_rate_limit')
        .update({
          attempt_count: existing.attempt_count + 1,
          last_attempt: now.toISOString()
        })
        .eq('email', email);
    } else {
      await supabase
        .from('auth_rate_limit')
        .insert({
          email,
          attempt_count: 1,
          last_attempt: now.toISOString()
        });
    }

    return new Response(
      JSON.stringify({ message: 'Failed attempt recorded' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Record login attempt error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to record attempt' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
