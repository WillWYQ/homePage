import { describe, it, expect, vi } from "vitest";

vi.mock("exifr", () => ({
  default: { parse: vi.fn() },
}));

import sharp from "sharp";
import exifr from "exifr";
import { resizeTiers, buildBlur, extractExif, SIZE_LADDER } from "./process-image.mjs";

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

describe("buildBlur", () => {
  it("produces a blurhash string and a matching PNG data URL", async () => {
    const buffer = await makeFixture(200, 150);
    const { blurhash, blurDataUrl } = await buildBlur(buffer);
    expect(typeof blurhash).toBe("string");
    expect(blurhash.length).toBeGreaterThan(0);
    expect(blurDataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it("returns nulls instead of throwing on unusable input", async () => {
    const { blurhash, blurDataUrl } = await buildBlur(Buffer.from("not an image"));
    expect(blurhash).toBeNull();
    expect(blurDataUrl).toBeNull();
  });
});

describe("extractExif", () => {
  it("maps parsed EXIF fields and formats shutter speed as a fraction", async () => {
    exifr.parse.mockResolvedValueOnce({
      Model: "X100V",
      LensModel: "23mm f/2",
      ISO: 640,
      FNumber: 2,
      ExposureTime: 1 / 250,
      FocalLength: 23,
      DateTimeOriginal: new Date("2026-06-30T19:42:00+08:00"),
    });
    const { exif, takenAt } = await extractExif(Buffer.from("fake"), {});
    expect(exif).toEqual({
      camera: "X100V",
      lens: "23mm f/2",
      iso: 640,
      aperture: 2,
      shutter: "1/250",
      focal: 23,
    });
    expect(takenAt).toBe(new Date("2026-06-30T19:42:00+08:00").toISOString());
  });

  it("falls back to frontmatter date when EXIF has no capture time", async () => {
    exifr.parse.mockResolvedValueOnce(null);
    const { exif, takenAt } = await extractExif(Buffer.from("fake"), {
      frontmatterDate: "2026-06-30",
    });
    expect(exif).toBeNull();
    expect(takenAt).toBe(new Date("2026-06-30").toISOString());
  });

  it("falls back to file mtime when EXIF and frontmatter date are both absent", async () => {
    exifr.parse.mockResolvedValueOnce(null);
    const mtime = new Date("2026-05-01T00:00:00Z");
    const { takenAt } = await extractExif(Buffer.from("fake"), { fileMtime: mtime });
    expect(takenAt).toBe(mtime.toISOString());
  });

  it("returns nulls for both when no source has a date", async () => {
    exifr.parse.mockResolvedValueOnce(null);
    const { exif, takenAt } = await extractExif(Buffer.from("fake"), {});
    expect(exif).toBeNull();
    expect(takenAt).toBeNull();
  });

  it("returns exif:null instead of throwing when parsing itself fails", async () => {
    exifr.parse.mockRejectedValueOnce(new Error("bad format"));
    const { exif, takenAt } = await extractExif(Buffer.from("fake"), {});
    expect(exif).toBeNull();
    expect(takenAt).toBeNull();
  });
});
