// Wave 2 — RAG ingest + query
// POST { action: 'ingest', kbId, documents: [{title,content,source}] }
// POST { action: 'query',  kbId, query, topK?, threshold? }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

async function embed(texts: string[], model = "google/text-embedding-004"): Promise<number[][]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
    body: JSON.stringify({ model, input: texts }),
  });
  if (!res.ok) throw new Error(`Embed failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.data.map((d: any) => d.embedding);
}

function chunk(text: string, size = 800, overlap = 100): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + size));
    i += size - overlap;
  }
  return chunks;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY missing" }, 500);
    const body = await req.json();
    const auth = req.headers.get("Authorization") ?? "";
    const user = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: u } = await user.auth.getUser();
    if (!u?.user) return json({ error: "Unauthorized" }, 401);

    if (body.action === "ingest") {
      const { kbId, documents } = body;
      if (!kbId || !Array.isArray(documents)) return json({ error: "kbId and documents required" }, 400);

      const { data: kb } = await admin.from("knowledge_bases").select("*").eq("id", kbId).maybeSingle();
      if (!kb) return json({ error: "KB not found" }, 404);

      const rows: any[] = [];
      for (const doc of documents) {
        const chunks = chunk(doc.content ?? "", kb.chunk_size, kb.chunk_overlap);
        if (chunks.length === 0) continue;
        const embeddings = await embed(chunks, kb.embedding_model);
        chunks.forEach((c, i) => rows.push({
          knowledge_base_id: kbId,
          title: doc.title ?? null,
          source: doc.source ?? null,
          chunk_index: i,
          content: c,
          embedding: embeddings[i] as any,
          metadata: doc.metadata ?? {},
        }));
      }
      if (rows.length === 0) return json({ ingested: 0 });

      const { error } = await admin.from("knowledge_documents").insert(rows);
      if (error) return json({ error: error.message }, 500);

      await admin.from("knowledge_bases")
        .update({ document_count: (kb.document_count ?? 0) + documents.length })
        .eq("id", kbId);

      return json({ ingested: rows.length, documents: documents.length });
    }

    if (body.action === "query") {
      const { kbId, query, topK = 5, threshold = 0.5 } = body;
      if (!kbId || !query) return json({ error: "kbId and query required" }, 400);

      const { data: kb } = await admin.from("knowledge_bases").select("embedding_model").eq("id", kbId).maybeSingle();
      const [q] = await embed([query], kb?.embedding_model ?? "google/text-embedding-004");

      const { data: matches, error } = await admin.rpc("match_knowledge_documents", {
        query_embedding: q as any,
        kb_id: kbId,
        match_count: topK,
        match_threshold: threshold,
      });
      if (error) return json({ error: error.message }, 500);
      return json({ matches: matches ?? [] });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
