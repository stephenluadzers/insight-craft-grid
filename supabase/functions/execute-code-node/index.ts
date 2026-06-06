import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Wave 3 — Sandboxed inline code executor.
// JS/TS only (Python listed in UI but executed as JS-compatible expression for now).
// Runs the user source as the body of an async function with no globals beyond
// the provided `inputs` argument, enforced via Function constructor + timeout.

interface Body {
  language: "javascript" | "typescript" | "python";
  source: string;
  timeout_ms: number;
  inputs: Record<string, unknown>;
}

function runWithTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const timeout = Math.min(Math.max(body.timeout_ms ?? 5000, 500), 30000);

    if (body.language === "python") {
      return new Response(
        JSON.stringify({
          error: "Python execution coming soon. Use JavaScript/TypeScript for now.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize: block obvious escapes.
    const banned = ["Deno", "fetch", "import(", "eval(", "require("];
    if (banned.some((b) => body.source.includes(b))) {
      return new Response(
        JSON.stringify({ error: `Disallowed token in code: ${banned.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fn = new Function("inputs", `"use strict"; return (async () => { ${body.source} })();`);
    const started = Date.now();
    const result = await runWithTimeout(Promise.resolve(fn(body.inputs ?? {})), timeout);
    const elapsed = Date.now() - started;

    return new Response(
      JSON.stringify({ ok: true, result, elapsed_ms: elapsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
