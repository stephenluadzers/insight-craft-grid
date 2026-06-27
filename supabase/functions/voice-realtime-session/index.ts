// Mint an ephemeral OpenAI Realtime session token for browser WebRTC voice
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { workspace_id, workflow_id, voice = 'alloy', model = 'gpt-4o-realtime-preview-2024-12-17', instructions } =
      await req.json().catch(() => ({}));
    if (!workspace_id) return json({ error: 'workspace_id required' }, 400);

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) return json({ error: 'OPENAI_API_KEY not configured' }, 500);

    const r = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, voice, instructions: instructions ?? 'You are a helpful workflow assistant.' }),
    });
    const data = await r.json();
    if (!r.ok) return json({ error: 'openai_error', details: data }, r.status);

    const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: row } = await supa.from('voice_sessions').insert({
      workspace_id, workflow_id, provider: 'openai-realtime', voice, status: 'active',
      metadata: { model, session_id: data.id },
    }).select('id').single();

    return json({ client_secret: data.client_secret, session_id: row?.id, model });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
