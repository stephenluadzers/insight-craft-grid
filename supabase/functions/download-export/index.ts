import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const sanitizeFilename = (value: string): string => {
  const cleaned = value
    .replace(/[\r\n"\\/<>:|?*\x00-\x1F]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);
  return cleaned || "remora-flow-export.bin";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const form = await req.formData();
    const filename = sanitizeFilename(String(form.get("filename") || "remora-flow-export.bin"));
    const contentType = String(form.get("contentType") || "application/octet-stream");
    const data = String(form.get("data") || "");

    if (!data) {
      return new Response("Missing export data", { status: 400, headers: corsHeaders });
    }

    const bytes = Uint8Array.from(atob(data), (char) => char.charCodeAt(0));

    return new Response(bytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("download-export failed:", error);
    return new Response("Failed to prepare download", { status: 500, headers: corsHeaders });
  }
});