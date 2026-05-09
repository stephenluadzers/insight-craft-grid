export function downloadBlob(blob: Blob, filename: string): string {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 60_000);
  return url;
}

export function withExportTimeout<T>(promise: Promise<T>, label = "Export", ms = 45_000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      window.setTimeout(() => reject(new Error(`${label} timed out. Try a smaller workflow or refresh and export again.`)), ms)
    ),
  ]);
}