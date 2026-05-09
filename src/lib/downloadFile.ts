type DownloadWindow = Window & typeof globalThis;

export interface DownloadTarget {
  readonly id: string;
  readonly filename: string;
  readonly window: DownloadWindow | null;
}

const DOWNLOAD_URL_TTL_MS = 15 * 60_000;

const escapeHtml = (value: string): string =>
  value.replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[char] || char));

const buildSafeFilename = (filename: string): string => {
  const trimmed = filename.trim().replace(/[\r\n"\\/<>:|?*\x00-\x1F]/g, "-");
  return trimmed.replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 180) || "remora-flow-export.bin";
};

export function openDownloadWindow(filename = "export"): DownloadTarget {
  const safeFilename = buildSafeFilename(filename);
  const id = `remora_download_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  let targetWindow: DownloadWindow | null = null;

  try {
    targetWindow = window.open("about:blank", id, "popup,width=560,height=460") as DownloadWindow | null;
    if (targetWindow) {
      targetWindow.document.open();
      targetWindow.document.write(renderPreparingDocument(safeFilename));
      targetWindow.document.close();
      targetWindow.focus();
    }
  } catch (error) {
    console.warn("Download window was blocked; falling back to in-page download.", error);
    targetWindow = null;
  }

  return { id, filename: safeFilename, window: targetWindow };
}

export function downloadBlob(blob: Blob, filename: string, target?: DownloadTarget | DownloadWindow | null): string {
  const safeFilename = buildSafeFilename(filename);
  const pageUrl = URL.createObjectURL(blob);
  const targetWindow = resolveTargetWindow(target);

  if (targetWindow && !targetWindow.closed) {
    renderReadyDocument(targetWindow, blob, safeFilename, pageUrl);
  }

  triggerAnchorDownload(pageUrl, safeFilename);
  window.setTimeout(() => URL.revokeObjectURL(pageUrl), DOWNLOAD_URL_TTL_MS);
  return pageUrl;
}

function resolveTargetWindow(target?: DownloadTarget | DownloadWindow | null): DownloadWindow | null {
  if (!target) return null;
  if ("document" in target) return target;
  return target.window;
}

function triggerAnchorDownload(url: string, filename: string): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.position = "fixed";
  anchor.style.left = "-9999px";
  anchor.style.top = "-9999px";
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => anchor.remove(), 1_000);
}

function renderPreparingDocument(filename: string): string {
  return `<!doctype html><html><head><title>Preparing ${escapeHtml(filename)}</title>${downloadPageHead()}</head><body><main class="box"><h1>Preparing download…</h1><p class="muted">Keep this tab open while Remora Flow prepares your file.</p><p class="name">${escapeHtml(filename)}</p></main></body></html>`;
}

function renderReadyDocument(targetWindow: DownloadWindow, blob: Blob, filename: string, openerUrl: string): void {
  const doc = targetWindow.document;
  const popupUrl = targetWindow.URL.createObjectURL(blob);

  doc.open();
  doc.write(`<!doctype html><html><head><title>Download ${escapeHtml(filename)}</title>${downloadPageHead()}</head><body><main class="box"><h1>Your export is ready</h1><p class="muted">If your browser did not show a save prompt, use the button below.</p><p class="name">${escapeHtml(filename)}</p><a id="download" class="button" href="${popupUrl}" download="${escapeHtml(filename)}">Download file</a><a class="fallback" href="${openerUrl}" download="${escapeHtml(filename)}">Backup link</a><p class="hint">You can close this tab after the file is saved.</p><script>setTimeout(function(){var a=document.getElementById('download'); if(a) a.click();}, 80);</script></main></body></html>`);
  doc.close();
  targetWindow.focus();
  targetWindow.setTimeout(() => targetWindow.URL.revokeObjectURL(popupUrl), DOWNLOAD_URL_TTL_MS);
}

function downloadPageHead(): string {
  return `<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0f172a;color:#f8fafc;display:grid;min-height:100vh;place-items:center}.box{box-sizing:border-box;max-width:480px;padding:32px}.muted,.hint{color:#cbd5e1;line-height:1.5}.hint{font-size:13px}.name{word-break:break-word;font-weight:800}.button,.fallback{display:inline-flex;margin-top:14px;margin-right:10px;padding:12px 16px;border-radius:8px;border:0;background:#2563eb;color:#fff;text-decoration:none;font-weight:800;cursor:pointer}.fallback{background:#334155}</style>`;
}

export function revokeDownloadUrl(url: string): void {
  window.setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_URL_TTL_MS);
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