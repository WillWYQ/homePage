import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { resizeTiers, SIZE_LADDER } from "./process-image.mjs";

async function makeFixture(width, height) {
  return sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 50, b: 50 } },
  })
    .png()
    .toBuffer();
}

describe("resizeTiers", () => {
  it("produces every tier for a source image larger than all tiers", async () => {
    const buffer = await makeFixture(3000, 2000);
    const { width, height, tiers } = await resizeTiers(buffer);
    expect(width).toBe(3000);
    expect(height).toBe(2000);
    expect(tiers.map((t) => t.width)).toEqual(SIZE_LADDER);
    for (const tier of tiers) {
      const meta = await sharp(tier.buffer).metadata();
      expect(meta.width).toBe(tier.width);
      expect(meta.format).toBe("webp");
    }
  });

  it("skips tiers wider than the source instead of upscaling", async () => {
    const buffer = await makeFixture(700, 500);
    const { tiers } = await resizeTiers(buffer);
    expect(tiers.map((t) => t.width)).toEqual([480]);
  });

  it("returns an empty tiers array when the source is narrower than the smallest tier", async () => {
    const buffer = await makeFixture(300, 200);
    const { tiers } = await resizeTiers(buffer);
    expect(tiers).toEqual([]);
  });
});
