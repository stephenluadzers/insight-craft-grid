// Ingest CDC events from external connectors (Debezium, Supabase Realtime relay, custom)
// POST { trigger_id, events: [{op, before, after, source}] }
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { trigger_id, events } = await req.json();
    if (!trigger_id || !Array.isArray(events)) return j({ error: 'trigger_id + events[] required' }, 400);
    const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: trig, error } = await supa.from('cdc_triggers').select('*').eq('id', trigger_id).single();
    if (error || !trig || !trig.is_active) return j({ error: 'trigger not found or inactive' }, 404);

    // Filter by configured events, fan out into execution queue
    const filtered = events.filter((e: any) => (trig.events as string[]).includes(String(e.op).toLowerCase()));
    if (filtered.length === 0) return j({ accepted: 0 });

    const rows = filtered.map((e: any) => ({
      workspace_id: trig.workspace_id,
      workflow_id: trig.workflow_id,
      status: 'pending',
      trigger_data: { cdc: e, source: trig.source_type, table: trig.table_name },
      priority: 5,
    }));
    await supa.from('workflow_execution_queue').insert(rows);
    return j({ accepted: filtered.length });
  } catch (e) { return j({ error: String(e?.message ?? e) }, 500); }
});
function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
