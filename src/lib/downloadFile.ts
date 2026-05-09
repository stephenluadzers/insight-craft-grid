export function downloadBlob(blob: Blob, filename: string): string {
  const url = URL.createObjectURL(blob);
  return url;
}

export function revokeDownloadUrl(url: string): void {
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
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