// Computer vision: OCR / classify / detect / extract_fields via Gemini multimodal
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const PROMPTS: Record<string, string> = {
  ocr: 'Extract ALL readable text from the image. Return JSON {"text": "..."}.',
  classify: 'Classify the image. Return JSON {"labels":[{"name":"","confidence":0-1}]}.',
  detect: 'Detect objects and bounding boxes (normalized 0-1). Return JSON {"objects":[{"label":"","box":[x,y,w,h],"confidence":0-1}]}.',
  describe: 'Describe the image in detail. Return JSON {"description":"..."}.',
  extract_fields: 'Extract structured fields from this document (invoice/receipt/form). Return JSON {"fields":{...},"line_items":[...]}.',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { workspace_id, workflow_id, job_type = 'ocr', image_url } = await req.json();
    if (!workspace_id || !image_url) return json({ error: 'workspace_id and image_url required' }, 400);
    if (!PROMPTS[job_type]) return json({ error: 'invalid job_type' }, 400);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
    const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: job } = await supa.from('vision_jobs').insert({
      workspace_id, workflow_id, job_type, input_url: image_url, status: 'running',
    }).select('id').single();

    const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: PROMPTS[job_type] + ' Reply ONLY with JSON, no prose.' },
            { type: 'image_url', image_url: { url: image_url } },
          ],
        }],
        response_format: { type: 'json_object' },
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      await supa.from('vision_jobs').update({ status: 'failed', error: JSON.stringify(data), completed_at: new Date().toISOString() }).eq('id', job!.id);
      return json({ error: 'ai_error', details: data }, r.status);
    }
    let parsed: unknown = data.choices?.[0]?.message?.content;
    try { parsed = JSON.parse(parsed as string); } catch {}
    await supa.from('vision_jobs').update({ status: 'succeeded', result: parsed, completed_at: new Date().toISOString() }).eq('id', job!.id);
    return json({ job_id: job?.id, result: parsed });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
