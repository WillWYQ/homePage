import { describe, it, expect } from "vitest";
import { photoSetSchema } from "./content-schema";

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
