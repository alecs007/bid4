import { API_BASE, IMAGE, USE_MOCK } from "@/lib/config";
import { ImageRejected, toDataUrl } from "@/lib/images/process";
import type { ProcessedImage } from "@/lib/images/process";
import { ApiError } from "@/lib/types";
import type { UploadedFileRef } from "@/lib/types";

import { readToken, refreshSession } from "./http";

interface UploadedFile {
  fileRef: string;
  url: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

async function postFiles(images: ProcessedImage[]): Promise<UploadedFile[]> {
  const send = (token: string | null) => {
    const body = new FormData();
    for (const image of images) {
      body.append("files", image.blob, image.fileName);
    }
    return fetch(`${API_BASE}/uploads/images`, {
      method: "POST",
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    });
  };

  let response = await send(readToken());
  if (response.status === 401) {
    const token = (await refreshSession())?.token ?? null;
    if (token) response = await send(token);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      code?: string;
      message?: string;
    } | null;
    throw new ApiError({
      status: response.status,
      code: body?.code ?? "UPLOAD_FAILED",
      message:
        body?.message ??
        (response.status === 413
          ? "Fotografiile depășesc dimensiunea acceptată."
          : "Fotografiile nu au putut fi încărcate. Încearcă din nou."),
    });
  }

  return (await response.json()) as UploadedFile[];
}

async function keepInBrowser(
  images: ProcessedImage[],
): Promise<UploadedFile[]> {
  const kept: UploadedFile[] = [];
  let spent = 0;

  for (const image of images) {
    const url = await toDataUrl(image.blob);
    spent += url.length;
    if (spent > IMAGE.DEMO_BUDGET_BYTES) {
      throw new ImageRejected(
        "Fotografiile ocupă prea mult spațiu pentru versiunea demonstrativă. Încearcă cu mai puține.",
      );
    }
    kept.push({
      fileRef: `mock://uploads/${crypto.randomUUID()}`,
      url,
      fileName: image.fileName,
      contentType: image.mimeType,
      sizeBytes: image.blob.size,
    });
  }

  return kept;
}

export function imageRefsFor(files: UploadedFileRef[]): string[] {
  return files.map((file) =>
    USE_MOCK ? (file.previewUrl ?? file.fileRef) : file.fileRef,
  );
}

export async function uploadImages(
  images: ProcessedImage[],
): Promise<UploadedFileRef[]> {
  if (!images.length) return [];

  const total = images.reduce((sum, image) => sum + image.blob.size, 0);
  if (!USE_MOCK && total > IMAGE.MAX_UPLOAD_BYTES) {
    throw new ImageRejected(
      "Fotografiile depășesc dimensiunea acceptată. Încearcă cu mai puține.",
    );
  }

  const stored = USE_MOCK
    ? await keepInBrowser(images)
    : await postFiles(images);

  return stored.map((file) => ({
    fileName: file.fileName,
    fileRef: file.fileRef,
    sizeBytes: file.sizeBytes,
    mimeType: file.contentType,
    previewUrl: file.url,
  }));
}
