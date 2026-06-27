// Submit / poll / cancel fine-tuning jobs (OpenAI for now; Gemini stub-ready)
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { action, workspace_id, job_id, base_model = 'gpt-4o-mini-2024-07-18', dataset_url, hyperparameters = {} } =
      await req.json();
    const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const OPENAI = Deno.env.get('OPENAI_API_KEY');

    if (action === 'submit') {
      if (!workspace_id || !dataset_url) return j({ error: 'workspace_id + dataset_url required' }, 400);
      if (!OPENAI) return j({ error: 'OPENAI_API_KEY missing' }, 500);

      // 1) Pull dataset, upload as a training file
      const ds = await fetch(dataset_url);
      if (!ds.ok) return j({ error: 'cannot fetch dataset_url' }, 400);
      const blob = await ds.blob();
      const form = new FormData();
      form.append('purpose', 'fine-tune');
      form.append('file', new File([blob], 'dataset.jsonl', { type: 'application/jsonl' }));
      const up = await fetch('https://api.openai.com/v1/files', {
        method: 'POST', headers: { Authorization: `Bearer ${OPENAI}` }, body: form,
      });
      const upData = await up.json();
      if (!up.ok) return j({ error: 'upload failed', details: upData }, up.status);

      const ft = await fetch('https://api.openai.com/v1/fine_tuning/jobs', {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ training_file: upData.id, model: base_model, hyperparameters }),
      });
      const ftData = await ft.json();
      if (!ft.ok) return j({ error: 'fine_tune failed', details: ftData }, ft.status);

      const { data: row } = await supa.from('fine_tune_jobs').insert({
        workspace_id, base_model, provider: 'openai', dataset_url,
        hyperparameters, status: 'training', provider_job_id: ftData.id,
      }).select('*').single();
      return j({ job: row });
    }

    if (action === 'poll') {
      if (!job_id) return j({ error: 'job_id required' }, 400);
      const { data: row } = await supa.from('fine_tune_jobs').select('*').eq('id', job_id).single();
      if (!row) return j({ error: 'not found' }, 404);
      if (!OPENAI || !row.provider_job_id) return j({ job: row });
      const r = await fetch(`https://api.openai.com/v1/fine_tuning/jobs/${row.provider_job_id}`, {
        headers: { Authorization: `Bearer ${OPENAI}` },
      });
      const data = await r.json();
      const status = data.status === 'succeeded' ? 'succeeded' : data.status === 'failed' ? 'failed' : 'training';
      const patch: any = { status, metrics: data, updated_at: new Date().toISOString() };
      if (data.fine_tuned_model) patch.fine_tuned_model = data.fine_tuned_model;
      await supa.from('fine_tune_jobs').update(patch).eq('id', job_id);
      return j({ job: { ...row, ...patch } });
    }

    if (action === 'cancel') {
      const { data: row } = await supa.from('fine_tune_jobs').select('*').eq('id', job_id).single();
      if (row?.provider_job_id && OPENAI) {
        await fetch(`https://api.openai.com/v1/fine_tuning/jobs/${row.provider_job_id}/cancel`, {
          method: 'POST', headers: { Authorization: `Bearer ${OPENAI}` },
        });
      }
      await supa.from('fine_tune_jobs').update({ status: 'cancelled' }).eq('id', job_id);
      return j({ ok: true });
    }

    return j({ error: 'unknown action' }, 400);
  } catch (e) { return j({ error: String(e?.message ?? e) }, 500); }
});
function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
