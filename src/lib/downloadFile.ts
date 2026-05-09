type DownloadPopup = Window & typeof globalThis;

const DOWNLOAD_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-export`;

const escapeHtml = (value: string): string =>
  value.replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[char] || char));

export function openDownloadWindow(filename = "export"): DownloadPopup | null {
  try {
    const popup = window.open("", "_blank", "popup,width=520,height=420") as DownloadPopup | null;
    if (!popup) return null;
    popup.name = `remora_download_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    popup.document.open();
    popup.document.write(`<!doctype html><html><head><title>Preparing ${escapeHtml(filename)}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:Inter,system-ui,sans-serif;background:#0f172a;color:#f8fafc;display:grid;min-height:100vh;place-items:center}.box{max-width:420px;padding:28px}.muted{color:#cbd5e1;line-height:1.5}.name{word-break:break-word;font-weight:700}a{color:#93c5fd;font-weight:700}</style></head><body><main class="box"><h1>Preparing download…</h1><p class="muted">Keep this tab open. Your file will be ready in a moment.</p><p class="name">${escapeHtml(filename)}</p></main></body></html>`);
    popup.document.close();
    popup.focus();
    return popup;
  } catch (error) {
    console.warn("Could not open download window:", error);
    return null;
  }
}

export function downloadBlob(blob: Blob, filename: string, popup?: DownloadPopup | null): string {
  const targetWindow = popup && !popup.closed ? popup : null;
  const url = URL.createObjectURL(blob);

  if (targetWindow) {
    const safeFilename = escapeHtml(filename);
    targetWindow.document.open();
    targetWindow.document.write(`<!doctype html><html><head><title>Download ${safeFilename}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:Inter,system-ui,sans-serif;background:#0f172a;color:#f8fafc;display:grid;min-height:100vh;place-items:center}.box{max-width:440px;padding:28px}.muted{color:#cbd5e1;line-height:1.5}.name{word-break:break-word;font-weight:700}.fallback{display:inline-flex;margin-top:14px;padding:12px 16px;border-radius:8px;background:#2563eb;color:white;text-decoration:none;font-weight:800}</style></head><body><main class="box"><h1>Starting download…</h1><p class="muted">Your browser is receiving a regular file response now. If it is blocked, use the fallback link below.</p><p class="name">${safeFilename}</p><a class="fallback" href="${url}" download="${safeFilename}">Fallback download</a></main></body></html>`);
    targetWindow.document.close();
    targetWindow.focus();
  }

  void submitBlobAsFileResponse(blob, filename, targetWindow?.name).catch((error) => {
    console.error("Download response failed, using blob fallback:", error);
  });

  window.setTimeout(() => URL.revokeObjectURL(url), 10 * 60_000);

  return url;
}

async function submitBlobAsFileResponse(blob: Blob, filename: string, targetName?: string): Promise<void> {
  const data = await blobToBase64(blob);
  const form = document.createElement("form");
  form.method = "POST";
  form.action = DOWNLOAD_FUNCTION_URL;
  form.enctype = "application/x-www-form-urlencoded";
  if (targetName) form.target = targetName;
  form.style.display = "none";

  const fields: Record<string, string> = {
    filename,
    contentType: blob.type || "application/octet-stream",
    data,
  };

  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
  window.setTimeout(() => form.remove(), 30_000);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(reader.error || new Error("Could not prepare file for download"));
    reader.readAsDataURL(blob);
  });
}

export function revokeDownloadUrl(url: string): void {
  window.setTimeout(() => URL.revokeObjectURL(url), 10 * 60_000);
}

export function sanitizeDownloadFilename(value: string, fallback = "workflow"): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || fallback;
}

export function withExportTimeout<T>(promise: Promise<T>, label = "Export", ms = 45_000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      window.setTimeout(() => reject(new Error(`${label} timed out. Try a smaller workflow or refresh and export again.`)), ms)
    ),
  ]);
}