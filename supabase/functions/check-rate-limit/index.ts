import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get or create rate limit record
    const { data: existing } = await supabase
      .from('auth_rate_limit')
      .select('*')
      .eq('email', email)
      .single();

    const now = new Date();

    if (existing) {
      // Check if account is locked
      if (existing.locked_until) {
        const lockedUntil = new Date(existing.locked_until);
        if (now < lockedUntil) {
          const remainingMinutes = Math.ceil((lockedUntil.getTime() - now.getTime()) / 60000);
          return new Response(
            JSON.stringify({
              allowed: false,
              locked: true,
              remainingMinutes,
              message: `Account locked. Try again in ${remainingMinutes} minute(s).`
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          // Lock expired, reset attempts
          await supabase
            .from('auth_rate_limit')
            .update({
              attempt_count: 0,
              locked_until: null,
              last_attempt: now.toISOString()
            })
            .eq('email', email);
        }
      }

      // Check attempt count
      if (existing.attempt_count >= MAX_ATTEMPTS) {
        const lockUntil = new Date(now.getTime() + LOCKOUT_DURATION_MINUTES * 60000);
        await supabase
          .from('auth_rate_limit')
          .update({
            locked_until: lockUntil.toISOString(),
            last_attempt: now.toISOString()
          })
          .eq('email', email);

        return new Response(
          JSON.stringify({
            allowed: false,
            locked: true,
            remainingMinutes: LOCKOUT_DURATION_MINUTES,
            message: `Too many failed attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.`
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        allowed: true,
        attemptsRemaining: MAX_ATTEMPTS - (existing?.attempt_count || 0)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Rate limit check error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to check rate limit' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
