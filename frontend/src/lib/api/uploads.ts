import { API_BASE, IMAGE, USE_MOCK } from "@/lib/config";
import { ImageRejected, toDataUrl } from "@/lib/images/process";
import type { ProcessedImage } from "@/lib/images/process";
import { ApiError } from "@/lib/types";
import type { UploadedFileRef } from "@/lib/types";

import { readToken, refreshSession } from "./http";

/**
 * What the server says about each stored object.
 *
 * <p>`fileRef` is the row's id and is what a listing is created with; `url` is a link that expires,
 * which is why nothing keeps one. The bucket carries no anonymous policy, so a URL is the only way
 * to see an object and a stale one simply stops working.
 */
interface UploadedFile {
  fileRef: string;
  url: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

/**
 * Sends the photographs and answers with what to build the listing from.
 *
 * <p>Multipart rather than JSON, and hand-rolled rather than through `http()`: that wrapper sets
 * `Content-Type: application/json` on everything it sends, and a multipart body needs the browser
 * to set the header itself so it can put the boundary in it. The 401-refresh-retry it exists for is
 * repeated here because an upload is the longest thing a seller waits on, and it is the call most
 * likely to arrive with a token that expired while a photograph was being chosen.
 */
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

/**
 * The demo's storage, which is the browser it is running in.
 *
 * <p>A data URL rather than the object URL the picker previews with: an object URL is a handle to
 * something held in the tab that made it, so a listing created with one showed a broken picture the
 * moment the page was reloaded. Data URLs survive that because the bytes are the address.
 *
 * <p>They are also the reason for the budget. Base64 costs a third on top, everything the demo
 * knows shares one localStorage entry of a few megabytes, and a seller who adds eight photographs
 * from a modern phone would fill it on their own — so the demo takes smaller copies and stops
 * before it runs out rather than after.
 */
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

/**
 * What a listing carries for each photograph.
 *
 * <p>The row's id where there is a server to resolve it: the buckets have no anonymous policy, so
 * an address is minted per request and expires, and storing one in a listing would mean a listing
 * whose pictures stop working on a timer. The demo has no server to ask, so it carries the bytes.
 */
export function imageRefsFor(files: UploadedFileRef[]): string[] {
  return files.map((file) =>
    USE_MOCK ? (file.previewUrl ?? file.fileRef) : file.fileRef,
  );
}

/**
 * POST /uploads/images — the photographs, before the listing that carries them.
 *
 * <p>Uploaded first and separately, so the listing is created from refs that already exist. Sending
 * both together would mean a listing that half-succeeded: rows written, pictures lost, and nothing
 * to point the seller at.
 */
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
