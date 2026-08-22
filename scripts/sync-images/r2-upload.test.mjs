// scripts/sync-images/r2-upload.test.mjs
import { describe, it, expect, vi } from "vitest";
import { checkCredentials, uploadTier } from "./r2-upload.mjs";

describe("checkCredentials", () => {
  it("is ok when all five variables are present", () => {
    const env = {
      R2_ACCOUNT_ID: "x",
      R2_ACCESS_KEY_ID: "x",
      R2_SECRET_ACCESS_KEY: "x",
      R2_BUCKET: "x",
      R2_PUBLIC_BASE_URL: "x",
    };
    expect(checkCredentials(env)).toEqual({ ok: true, missing: [] });
  });

  it("lists every missing variable", () => {
    const result = checkCredentials({ R2_BUCKET: "x" });
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual([
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_PUBLIC_BASE_URL",
    ]);
  });
});

describe("uploadTier", () => {
  it("skips PutObject when HeadObject finds the key already exists", async () => {
    const send = vi.fn().mockResolvedValueOnce({});
    const client = { send };
    const result = await uploadTier(client, {
      bucket: "b",
      key: "k",
      body: Buffer.from("x"),
      contentType: "image/webp",
    });
    expect(result).toEqual({ uploaded: false });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("uploads with the correct params when HeadObject reports NotFound", async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce({ name: "NotFound" })
      .mockResolvedValueOnce({});
    const client = { send };
    const result = await uploadTier(client, {
      bucket: "b",
      key: "k",
      body: Buffer.from("x"),
      contentType: "image/webp",
    });
    expect(result).toEqual({ uploaded: true });
    expect(send).toHaveBeenCalledTimes(2);
    const putCommand = send.mock.calls[1][0];
    expect(putCommand.input).toMatchObject({
      Bucket: "b",
      Key: "k",
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    });
  });

  it("rethrows unexpected HeadObject errors instead of treating them as not-found", async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error("network down"));
    const client = { send };
    await expect(
      uploadTier(client, {
        bucket: "b",
        key: "k",
        body: Buffer.from("x"),
        contentType: "image/webp",
      }),
    ).rejects.toThrow("network down");
  });
});
