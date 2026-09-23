import { describe, expect, it } from "vitest";

import { coverScale, cropOf, turn } from "./edit";

const FRAME = { width: 300, height: 400 };

function view(
  turned: { width: number; height: number },
  zoom = 1,
  offset = { x: 0, y: 0 },
) {
  return {
    turned,
    frame: FRAME,
    scale: coverScale(turned, FRAME) * zoom,
    offset,
  };
}

describe("turning a photograph", () => {
  const photo = { width: 800, height: 600 };

  it("swaps the sides on a quarter turn and keeps them on a half", () => {
    expect(turn(photo, 0)).toEqual({ width: 800, height: 600 });
    expect(turn(photo, 90)).toEqual({ width: 600, height: 800 });
    expect(turn(photo, 180)).toEqual({ width: 800, height: 600 });
    expect(turn(photo, 270)).toEqual({ width: 600, height: 800 });
  });
});

describe("the crop the frame stands over", () => {
  it("is the tallest three-by-four the photograph holds, centred", () => {
    const crop = cropOf(view({ width: 800, height: 600 }));

    expect(crop.height).toBeCloseTo(600);
    expect(crop.width).toBeCloseTo(450);
    expect(crop.width / crop.height).toBeCloseTo(FRAME.width / FRAME.height);
    expect(crop.x).toBeCloseTo(175);
    expect(crop.y).toBeCloseTo(0);
  });

  it("takes the whole of a photograph already in that shape", () => {
    const crop = cropOf(view({ width: 900, height: 1200 }));

    expect(crop).toEqual({ x: 0, y: 0, width: 900, height: 1200 });
  });

  it("follows the photograph as it is dragged under the frame", () => {
    const wide = { width: 800, height: 600 };
    const scale = coverScale(wide, FRAME);
    const dragged = cropOf(view(wide, 1, { x: 30 * scale, y: 0 }));

    expect(dragged.x).toBeCloseTo(145);
    expect(dragged.width).toBeCloseTo(450);
  });

  it("takes less of the photograph the closer it is zoomed", () => {
    const photo = { width: 800, height: 600 };
    const close = cropOf(view(photo, 2));

    expect(close.width).toBeCloseTo(225);
    expect(close.height).toBeCloseTo(300);
    expect(close.width / close.height).toBeCloseTo(FRAME.width / FRAME.height);
  });

  it("never reaches past the edges, however far it is pushed", () => {
    const photo = { width: 800, height: 600 };

    for (const offset of [
      { x: 10_000, y: 10_000 },
      { x: -10_000, y: -10_000 },
    ]) {
      const crop = cropOf(view(photo, 1.5, offset));

      expect(crop.x).toBeGreaterThanOrEqual(0);
      expect(crop.y).toBeGreaterThanOrEqual(0);
      expect(crop.x + crop.width).toBeLessThanOrEqual(photo.width);
      expect(crop.y + crop.height).toBeLessThanOrEqual(photo.height);
    }
  });
});
