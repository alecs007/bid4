import { encode, ImageRejected, INTAKE } from "./process";
import type { ProcessedImage } from "./process";

export type Rotation = 0 | 90 | 180 | 270;

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function turn(
  size: { width: number; height: number },
  rotation: Rotation,
): { width: number; height: number } {
  return rotation % 180 === 0
    ? { width: size.width, height: size.height }
    : { width: size.height, height: size.width };
}

export interface View {
  turned: { width: number; height: number };
  frame: { width: number; height: number };
  scale: number;
  offset: { x: number; y: number };
}

export function coverScale(
  turned: { width: number; height: number },
  frame: { width: number; height: number },
): number {
  return Math.max(frame.width / turned.width, frame.height / turned.height);
}

export function cropOf({ turned, frame, scale, offset }: View): CropRect {
  const width = Math.min(turned.width, frame.width / scale);
  const height = Math.min(turned.height, frame.height / scale);
  const x = turned.width / 2 - (frame.width / 2 + offset.x) / scale;
  const y = turned.height / 2 - (frame.height / 2 + offset.y) / scale;

  return {
    x: Math.min(Math.max(0, x), turned.width - width),
    y: Math.min(Math.max(0, y), turned.height - height),
    width,
    height,
  };
}

export async function editImage(
  source: ProcessedImage,
  edit: { rotation: Rotation; crop?: CropRect },
  options: { quality?: number } = {},
): Promise<ProcessedImage> {
  const quality = options.quality ?? INTAKE.quality;
  const bitmap = await createImageBitmap(source.blob);

  try {
    const turned = turn(bitmap, edit.rotation);
    const area = edit.crop ?? { x: 0, y: 0, ...turned };
    const width = Math.max(1, Math.round(area.width));
    const height = Math.max(1, Math.round(area.height));

    const canvas =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(width, height)
        : Object.assign(document.createElement("canvas"), { width, height });

    const context = canvas.getContext("2d") as
      | OffscreenCanvasRenderingContext2D
      | CanvasRenderingContext2D
      | null;
    if (!context) {
      throw new ImageRejected("Fotografia nu a putut fi pregătită.");
    }

    context.translate(-Math.round(area.x), -Math.round(area.y));
    if (edit.rotation === 90) context.translate(turned.width, 0);
    if (edit.rotation === 180) context.translate(turned.width, turned.height);
    if (edit.rotation === 270) context.translate(0, turned.height);
    context.rotate((edit.rotation * Math.PI) / 180);
    context.drawImage(bitmap, 0, 0);

    const blob = await encode(canvas, quality);
    const previewUrl = URL.createObjectURL(blob);

    return {
      blob,
      fileName: source.fileName,
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
