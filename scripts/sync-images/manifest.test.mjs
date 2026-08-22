// scripts/sync-images/manifest.test.mjs
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { readManifest, mergeManifest, writeManifest, diffForDryRun } from "./manifest.mjs";

describe("readManifest", () => {
  it("returns an empty object when the file doesn't exist", () => {
    expect(readManifest("/nonexistent/path/manifest.json")).toEqual({});
  });

  it("parses an existing manifest file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-test-"));
    const file = path.join(dir, "manifest.json");
    fs.writeFileSync(file, JSON.stringify({ "photos/a/1.jpg": { id: "abc123" } }));
    expect(readManifest(file)).toEqual({ "photos/a/1.jpg": { id: "abc123" } });
  });
});

describe("mergeManifest", () => {
  it("adds new entries, overwrites matching keys, keeps untouched keys", () => {
    const existing = { "a.jpg": { id: "old" }, "b.jpg": { id: "keep" } };
    const updates = { "a.jpg": { id: "new" } };
    expect(mergeManifest(existing, updates)).toEqual({
      "a.jpg": { id: "new" },
      "b.jpg": { id: "keep" },
    });
  });
});

describe("writeManifest + readManifest round-trip", () => {
  it("writes key-sorted JSON that reads back identically", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-test-"));
    const file = path.join(dir, "manifest.json");
    const manifest = { "z.jpg": { id: "z" }, "a.jpg": { id: "a" } };
    writeManifest(file, manifest);
    const raw = fs.readFileSync(file, "utf8");
    expect(raw.indexOf('"a.jpg"')).toBeLessThan(raw.indexOf('"z.jpg"'));
    expect(readManifest(file)).toEqual(manifest);
  });
});

describe("diffForDryRun", () => {
  it("classifies unchanged content as skip, new/changed content as pending", () => {
    const existing = { "a.jpg": { id: "hash-a" }, "b.jpg": { id: "hash-b-old" } };
    const candidates = [
      { source: "a.jpg", id: "hash-a" },
      { source: "b.jpg", id: "hash-b-new" },
      { source: "c.jpg", id: "hash-c" },
    ];
    expect(diffForDryRun(existing, candidates)).toEqual({
      skip: ["a.jpg"],
      pending: ["b.jpg", "c.jpg"],
    });
  });

  it("produces identical classification on repeated calls against unchanged input (spec §4.1 idempotency signal)", () => {
    const existing = { "a.jpg": { id: "hash-a" } };
    const candidates = [{ source: "a.jpg", id: "hash-a" }];
    const first = diffForDryRun(existing, candidates);
    const second = diffForDryRun(existing, candidates);
    expect(first).toEqual(second);
    expect(first.pending).toEqual([]);
  });
});
