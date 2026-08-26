import type { UploadedFileRef } from "@/lib/types";

/**
 * TODO(backend): POST /uploads returns `{ fileRef }`, and identity documents go
 * to a private bucket. Today nothing leaves the browser — the preview is an
 * object URL, which is why a resumed draft shows a name rather than a thumbnail.
 */
export function toFileRef(file: File): UploadedFileRef {
  const isImage = file.type.startsWith("image/");
  return {
    fileName: file.name,
    fileRef: `mock://uploads/${crypto.randomUUID()}`,
    sizeBytes: file.size,
    mimeType: file.type,
    previewUrl: isImage ? URL.createObjectURL(file) : undefined,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
