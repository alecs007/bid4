import { IMAGE } from "@/lib/config";

/**
 * A photograph after the browser has taken it apart and put it back together.
 *
 * <p>`blob` is what is uploaded and `previewUrl` is what is shown, and they are the same bytes —
 * the preview is not the original file. Whoever holds one of these owns the object URL and must
 * `release()` it when the picture is dropped, or the bytes stay in memory for the life of the tab.
 */
export interface ProcessedImage {
  blob: Blob;
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  previewUrl: string;
  release: () => void;
}

/** Why a file was turned away, in the seller's own language. */
export class ImageRejected extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageRejected";
  }
}

/**
 * Decodes the file, and applies the rotation it was taken at.
 *
 * <p>The decode is the first real check on a file. A type is a claim a browser makes from the
 * first few bytes and a name is a claim the file makes about itself; neither says the contents are
 * an image, and something that only claims to be one fails here rather than on a server.
 *
 * <p>`from-image` is what keeps a photograph taken sideways from being uploaded sideways: phones
 * record the rotation in EXIF rather than in the pixels, and the canvas below reads pixels only.
 * Where the option is not understood the picture still decodes, just as the sensor wrote it.
 */
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

/** Whichever of the two the browser can encode; the size difference is about a third. */
async function encode(
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
    // A browser that cannot write the format does not say so: it quietly hands
    // back a PNG instead, which for a photograph is several times the size.
    return blob && blob.type === type ? blob : null;
  };

  const webp = await attempt("image/webp");
  if (webp) return webp;

  const jpeg = await attempt("image/jpeg");
  if (jpeg) return jpeg;

  throw new ImageRejected("Fotografia nu a putut fi pregătită.");
}

/**
 * A photograph as it will be stored: no bigger than it needs to be, and carrying nothing but the
 * picture.
 *
 * <p>Everything a camera writes beside the pixels — where it was taken, on what, by whom — is gone
 * by construction rather than by being stripped: what is uploaded is drawn from the decoded pixels
 * onto a fresh canvas and encoded again, so only pixels survive the trip. The same redraw is what
 * makes a file that is both a valid image and something else harmless, because the something else
 * is not among the pixels.
 *
 * <p>It is also most of the optimisation. A phone photograph is eight megapixels and several
 * megabytes, and it is displayed here in a card a few hundred pixels wide; the long edge is capped
 * at a size that still holds up full-screen, which is what takes a listing's eight photographs from
 * twenty megabytes to under two.
 */
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
    // A few kilobytes of file can decode to hundreds of megabytes of canvas —
    // that is the whole trick behind a decompression bomb, and the ceiling is
    // on what came out rather than on what went in.
    if (bitmap.width * bitmap.height > IMAGE.MAX_PIXELS) {
      throw new ImageRejected("Fotografia are o rezoluție prea mare.");
    }

    // Never upscaled: a small photograph stays small rather than being blown up
    // into a bigger file that shows exactly as much.
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
      // Kept for the upload's filename and nothing else. It is the seller's
      // text, so it is never used as a key or a path.
      fileName: file.name,
      mimeType: blob.type,
      width,
      height,
      previewUrl,
      release: () => URL.revokeObjectURL(previewUrl),
    };
  } finally {
    // The decoded copy can be tens of megabytes and is of no further use once
    // it has been drawn.
    bitmap.close();
  }
}

/** Bytes as a data URL, which is how a picture is kept where there is no server to keep it. */
export function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(new ImageRejected("Fotografia nu a putut fi salvată."));
    reader.readAsDataURL(blob);
  });
}
