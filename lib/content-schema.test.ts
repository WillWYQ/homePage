import { describe, it, expect } from "vitest";
import { photoSetSchema, reelSchema } from "./content-schema";

describe("photoSetSchema", () => {
  it("accepts an empty frontmatter (pure image group, no index.md fields required)", () => {
    expect(photoSetSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a full valid frontmatter", () => {
    const result = photoSetSchema.safeParse({
      title: "杭州,六月",
      date: "2026-06-30",
      photos: [
        { file: "DSCF1234.jpg", caption: "湖边等末班车" },
        { file: "DSCF1250.jpg" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a photos[] item missing file", () => {
    const result = photoSetSchema.safeParse({ photos: [{ caption: "no file" }] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["photos", 0, "file"]);
    }
  });

  it("rejects a file name without a recognized image extension", () => {
    const result = photoSetSchema.safeParse({ photos: [{ file: "notes.txt" }] });
    expect(result.success).toBe(false);
  });

  it("rejects an unparseable date", () => {
    const result = photoSetSchema.safeParse({ date: "not-a-date" });
    expect(result.success).toBe(false);
  });
});

describe("reelSchema", () => {
  it("accepts empty frontmatter (both sections absent)", () => {
    expect(reelSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a full valid frontmatter", () => {
    const result = reelSchema.safeParse({
      favorites: [
        {
          title: "Album Name / Artist",
          note: "It did something to me.",
          sleeve: "/reel/some-album.jpg",
          href: "https://example.com",
        },
        { title: "Another album" },
      ],
      log: [
        { date: "2026-08-20", text: "Been on a kick." },
        { date: "2026-08-15", text: "Background noise.", ref: "/lab/002-tonight-tides" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a favorites[] item missing title", () => {
    const result = reelSchema.safeParse({ favorites: [{ note: "no title" }] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["favorites", 0, "title"]);
    }
  });

  it("rejects a sleeve path outside /reel/", () => {
    const result = reelSchema.safeParse({
      favorites: [{ title: "x", sleeve: "/photos/cover.jpg" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a log[] item missing date", () => {
    const result = reelSchema.safeParse({ log: [{ text: "no date" }] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["log", 0, "date"]);
    }
  });

  it("rejects an unparseable log date", () => {
    const result = reelSchema.safeParse({ log: [{ date: "not-a-date", text: "x" }] });
    expect(result.success).toBe(false);
  });

  it("rejects a ref that isn't a site-internal path", () => {
    const result = reelSchema.safeParse({
      log: [{ date: "2026-08-20", text: "x", ref: "https://external.example" }],
    });
    expect(result.success).toBe(false);
  });
});
