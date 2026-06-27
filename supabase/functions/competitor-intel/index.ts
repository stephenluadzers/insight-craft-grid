// Competitor intelligence: snapshot a target, diff against previous, summarize with Gemini
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { action, target_id, workspace_id, name, domain, social_handles = {}, watch_keywords = [] } = await req.json();
    const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const LOVABLE = Deno.env.get('LOVABLE_API_KEY')!;

    if (action === 'add_target') {
      const { data } = await supa.from('competitor_targets').insert({
        workspace_id, name, domain, social_handles, watch_keywords,
      }).select('*').single();
      return j({ target: data });
    }

    if (action === 'snapshot') {
      const { data: t } = await supa.from('competitor_targets').select('*').eq('id', target_id).single();
      if (!t) return j({ error: 'target not found' }, 404);

      // 1) Pull homepage/pricing
      const pages: Record<string, string> = {};
      if (t.domain) {
        for (const path of ['', '/pricing', '/blog']) {
          try {
            const r = await fetch(`https://${t.domain}${path}`, { headers: { 'User-Agent': 'RemoraFlow-Intel/1.0' } });
            if (r.ok) pages[path || '/'] = (await r.text()).slice(0, 50_000);
          } catch {}
        }
      }

      // 2) Diff vs previous snapshot
      const { data: prev } = await supa.from('competitor_snapshots')
        .select('*').eq('target_id', target_id).order('captured_at', { ascending: false }).limit(1).maybeSingle();

      // 3) Summarize + extract signals via Gemini
      const ai = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${LOVABLE}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a competitive intelligence analyst. Extract pricing tiers, new features, hiring signals, and notable changes. Reply ONLY JSON: {"summary":"","diff":"","signals":{"pricing":[],"features":[],"hiring":[],"messaging":""}}' },
            { role: 'user', content: JSON.stringify({ target: { name: t.name, domain: t.domain, keywords: t.watch_keywords }, current_pages: pages, previous_snapshot: prev?.snapshot ?? null }).slice(0, 80_000) },
          ],
          response_format: { type: 'json_object' },
        }),
      });
      const data = await ai.json();
      let parsed: any = data.choices?.[0]?.message?.content;
      try { parsed = JSON.parse(parsed); } catch { parsed = { summary: String(parsed ?? '') }; }

      const { data: snap } = await supa.from('competitor_snapshots').insert({
        target_id, workspace_id: t.workspace_id, source: 'web',
        snapshot: { pages, captured_at: new Date().toISOString() },
        diff_summary: parsed.diff ?? parsed.summary ?? null,
        signals: parsed.signals ?? {},
      }).select('*').single();
      return j({ snapshot: snap, analysis: parsed });
    }

    if (action === 'list') {
      const { data } = await supa.from('competitor_targets').select('*, competitor_snapshots(captured_at, diff_summary, signals)').eq('workspace_id', workspace_id);
      return j({ targets: data });
    }

    return j({ error: 'unknown action' }, 400);
  } catch (e) { return j({ error: String(e?.message ?? e) }, 500); }
});
function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
