import { describe, it, expect } from "vitest";
import { contentHash } from "./hash.mjs";

describe("contentHash", () => {
  it("returns a 10-char hex string", () => {
    const hash = contentHash(Buffer.from("hello"));
    expect(hash).toMatch(/^[0-9a-f]{10}$/);
  });

  it("is deterministic for identical content", () => {
    const a = contentHash(Buffer.from("same bytes"));
    const b = contentHash(Buffer.from("same bytes"));
    expect(a).toBe(b);
  });

  it("differs for different content", () => {
    const a = contentHash(Buffer.from("content A"));
    const b = contentHash(Buffer.from("content B"));
    expect(a).not.toBe(b);
  });
});
