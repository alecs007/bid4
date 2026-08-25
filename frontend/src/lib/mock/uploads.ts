import type { UploadedFileRef } from "@/lib/types";

/**
 * Turns a picked file into the reference the rest of the app passes around.
 *
 * TODO(backend): POST /uploads (multipart) returns `{ fileRef }` from object
 * storage, and identity documents go to a private bucket the public API never
 * reads from. Today nothing leaves the browser: the ref is minted here and the
 * preview is an object URL, which is why it does not survive a reload — a
 * resumed draft shows the file's name and a placeholder rather than a thumbnail.
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
