import type { DocumentSummary } from "@shared/schema";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function uploadDocument(file: File): Promise<DocumentSummary> {
  if (file.size > MAX_FILE_SIZE) throw new Error("Files must be 10 MB or smaller.");

  const body = new FormData();
  body.append("file", file);
  const response = await fetch("/api/documents/upload", {
    method: "POST",
    body,
    credentials: "include",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string; message?: string } | null;
    throw new Error(payload?.error || payload?.message || `Upload failed (${response.status})`);
  }

  return response.json();
}
