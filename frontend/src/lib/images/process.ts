import { IMAGE, USE_MOCK } from "@/lib/config";

export const INTAKE = USE_MOCK
  ? { maxEdge: IMAGE.DEMO_MAX_EDGE_PX, quality: IMAGE.DEMO_QUALITY }
  : { maxEdge: IMAGE.MAX_EDGE_PX, quality: IMAGE.QUALITY };

export interface ProcessedImage {
  blob: Blob;
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  previewUrl: string;
  release: () => void;
}

export class ImageRejected extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageRejected";
  }
}

async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    try {
      return await createImageBitmap(file);
    } catch {
      throw new ImageRejected("Fișierul nu a putut fi citit ca imagine.");
    }
  }
}

export async function encode(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  const attempt = async (type: string): Promise<Blob | null> => {
    const blob =
      canvas instanceof OffscreenCanvas
        ? await canvas.convertToBlob({ type, quality })
        : await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, type, quality),
          );
    return blob && blob.type === type ? blob : null;
  };

  const webp = await attempt("image/webp");
  if (webp) return webp;

  const jpeg = await attempt("image/jpeg");
  if (jpeg) return jpeg;

  throw new ImageRejected("Fotografia nu a putut fi pregătită.");
}

export async function processImage(
  file: File,
  options: { maxEdge?: number; quality?: number } = {},
): Promise<ProcessedImage> {
  const maxEdge = options.maxEdge ?? IMAGE.MAX_EDGE_PX;
  const quality = options.quality ?? IMAGE.QUALITY;

  if (!IMAGE.ACCEPTED_TYPES.includes(file.type)) {
    throw new ImageRejected("Acceptăm doar fotografii JPG, PNG sau WEBP.");
  }
  if (file.size > IMAGE.MAX_INPUT_BYTES) {
    throw new ImageRejected(`Fotografia depășește ${IMAGE.MAX_INPUT_MB} MB.`);
  }

  const bitmap = await decode(file);
  try {
    if (bitmap.width * bitmap.height > IMAGE.MAX_PIXELS) {
      throw new ImageRejected("Fotografia are o rezoluție prea mare.");
    }

    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(width, height)
        : Object.assign(document.createElement("canvas"), { width, height });

    const context = canvas.getContext("2d") as
      OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;
    if (!context)
      throw new ImageRejected("Fotografia nu a putut fi pregătită.");
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await encode(canvas, quality);
    const previewUrl = URL.createObjectURL(blob);

    return {
      blob,
      fileName: file.name,
      mimeType: blob.type,
      width,
      height,
      previewUrl,
      release: () => URL.revokeObjectURL(previewUrl),
    };
  } finally {
    bitmap.close();
  }
}

export function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(new ImageRejected("Fotografia nu a putut fi salvată."));
    reader.readAsDataURL(blob);
  });
}
