import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { getPhotoRolls, getPhotoRoll } from "./content";

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "photos-fixture-"));
  const photosDir = path.join(root, "photos");
  fs.mkdirSync(photosDir, { recursive: true });

  const rollA = path.join(photosDir, "2026-06-hangzhou");
  fs.mkdirSync(rollA);
  fs.writeFileSync(path.join(rollA, "DSCF1234.jpg"), "fake-bytes-1234");
  fs.writeFileSync(path.join(rollA, "DSCF1250.jpg"), "fake-bytes-1250");
  fs.writeFileSync(path.join(rollA, "DSCF9999.jpg"), "fake-bytes-9999"); // 不在 photos[] 里
  fs.writeFileSync(
    path.join(rollA, "index.md"),
    [
      "---",
      "title: 杭州,六月",
      "date: 2026-06-30",
      "photos:",
      "  - file: DSCF1234.jpg",
      "    caption: 湖边等末班车",
      "  - file: DSCF1250.jpg",
      "---",
      "这一卷的正文说明。",
    ].join("\n"),
  );

  const rollB = path.join(photosDir, "no-caption-roll");
  fs.mkdirSync(rollB);
  fs.writeFileSync(path.join(rollB, "IMG_0001.jpg"), "fake-bytes-0001");

  const manifestPath = path.join(root, "image-manifest.json");
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({
      "photos/2026-06-hangzhou/DSCF1234.jpg": {
        id: "hash1234",
        roll: "2026-06-hangzhou",
        takenAt: "2026-06-30T19:42:00.000Z",
        width: 6240,
        height: 4160,
        blurhash: "LEHV6n...",
        blurDataUrl: "data:image/png;base64,AAA=",
        exif: { camera: "X100V" },
        sizes: {
          "480": "https://img.willsleep.dev/hash1234-480.webp",
          "960": "https://img.willsleep.dev/hash1234-960.webp",
        },
      },
      // DSCF1250.jpg / DSCF9999.jpg / IMG_0001.jpg 故意不在 manifest 里
    }),
  );

  return {
    root,
    photosDir,
    manifestPath,
    rollA,
    devLinkPath: path.join(root, "public", "_dev-photos"),
  };
}

describe("getPhotoRolls / getPhotoRoll", () => {
  let fixture: ReturnType<typeof makeFixture>;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    fixture = makeFixture();
  });

  afterEach(() => {
    fs.rmSync(fixture.root, { recursive: true, force: true });
    Object.defineProperty(process.env, "NODE_ENV", {
      value: originalEnv,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  });

  function setEnv(value: string) {
    Object.defineProperty(process.env, "NODE_ENV", {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }

  it("renders manifest-hit frames with real sizes and drops manifest-miss frames in production", async () => {
    setEnv("production");
    const rolls = await getPhotoRolls({
      photosDir: fixture.photosDir,
      manifestPath: fixture.manifestPath,
      devLinkPath: fixture.devLinkPath,
    });
    const rollA = rolls.find((r) => r.slug === "2026-06-hangzhou")!;
    expect(rollA.title).toBe("杭州,六月");
    expect(rollA.date).toBe(new Date("2026-06-30").toISOString());
    expect(rollA.frames.map((f) => f.file)).toEqual(["DSCF1234.jpg"]);
    expect(rollA.frames[0].caption).toBe("湖边等末班车");
    expect(rollA.frames[0].sizes).toMatchObject({
      "480": "https://img.willsleep.dev/hash1234-480.webp",
    });
  });

  it("orders frames: frontmatter photos[] first, then unlisted files by filename", async () => {
    setEnv("development");
    const roll = await getPhotoRoll("2026-06-hangzhou", {
      photosDir: fixture.photosDir,
      manifestPath: fixture.manifestPath,
      devLinkPath: fixture.devLinkPath,
    });
    expect(roll?.frames.map((f) => f.file)).toEqual([
      "DSCF1234.jpg",
      "DSCF1250.jpg",
      "DSCF9999.jpg",
    ]);
  });

  it("falls back to local dev serving for manifest-miss frames outside production", async () => {
    setEnv("development");
    const roll = await getPhotoRoll("2026-06-hangzhou", {
      photosDir: fixture.photosDir,
      manifestPath: fixture.manifestPath,
      devLinkPath: fixture.devLinkPath,
    });
    const missFrame = roll?.frames.find((f) => f.file === "DSCF1250.jpg");
    expect(missFrame?.sizes?.["480"]).toBe(
      "/_dev-photos/2026-06-hangzhou/DSCF1250.jpg",
    );
    expect(missFrame?.blurDataUrl).toBeNull();
    expect(fs.existsSync(fixture.devLinkPath)).toBe(true); // 符号链接真的建在 fixture 目录里,不是真实仓库
  });

  it("uses the folder name as title and sorts date-less rolls last", async () => {
    setEnv("production");
    const rolls = await getPhotoRolls({
      photosDir: fixture.photosDir,
      manifestPath: fixture.manifestPath,
      devLinkPath: fixture.devLinkPath,
    });
    const rollB = rolls.find((r) => r.slug === "no-caption-roll")!;
    expect(rollB.title).toBe("no-caption-roll");
    expect(rolls[rolls.length - 1].slug).toBe("no-caption-roll");
  });

  it("throws with the offending file and field when frontmatter fails validation", async () => {
    fs.writeFileSync(
      path.join(fixture.rollA, "index.md"),
      ["---", "photos:", "  - caption: 缺 file 字段", "---"].join("\n"),
    );
    await expect(
      getPhotoRolls({
        photosDir: fixture.photosDir,
        manifestPath: fixture.manifestPath,
        devLinkPath: fixture.devLinkPath,
      }),
    ).rejects.toThrow(/2026-06-hangzhou[\s\S]*photos\.0\.file/);
  });

  it("throws (rather than silently overwriting) when the manifest file is malformed JSON", async () => {
    fs.writeFileSync(fixture.manifestPath, "{ not valid json");
    await expect(
      getPhotoRolls({
        photosDir: fixture.photosDir,
        manifestPath: fixture.manifestPath,
        devLinkPath: fixture.devLinkPath,
      }),
    ).rejects.toThrow();
  });

  it("returns [] when the photos directory doesn't exist", async () => {
    const rolls = await getPhotoRolls({
      photosDir: "/nonexistent/dir",
      manifestPath: fixture.manifestPath,
      devLinkPath: fixture.devLinkPath,
    });
    expect(rolls).toEqual([]);
  });
});
