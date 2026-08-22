// scripts/sync-images/icloud.test.mjs
import { describe, it, expect, vi } from "vitest";
import { isDataless, waitForMaterialize } from "./icloud.mjs";

describe("isDataless", () => {
  it("detects the dataless flag in ls -lO output", () => {
    expect(
      isDataless("-rw-r--r--  1 user  staff  dataless 12345 Jun 30 DSCF1234.jpg"),
    ).toBe(true);
  });

  it("returns false when the flag is absent", () => {
    expect(isDataless("-rw-r--r--  1 user  staff  12345 Jun 30 DSCF1234.jpg")).toBe(
      false,
    );
  });
});

describe("waitForMaterialize", () => {
  it("returns immediately when the file is already materialized", async () => {
    const checkFn = vi.fn().mockResolvedValue(false);
    const result = await waitForMaterialize("/fake/path.jpg", {
      checkFn,
      sleepFn: async () => {},
    });
    expect(result).toEqual({ materialized: true, waitedMs: 0 });
    expect(checkFn).toHaveBeenCalledTimes(1);
  });

  it("polls until the file materializes, calling onDataless exactly once", async () => {
    let calls = 0;
    const checkFn = vi.fn().mockImplementation(async () => {
      calls++;
      return calls < 3; // dataless 两次,第三次已下载完
    });
    const onDataless = vi.fn().mockResolvedValue(undefined);
    const result = await waitForMaterialize("/fake/path.jpg", {
      checkFn,
      sleepFn: async () => {},
      onDataless,
      timeoutMs: 10000,
      pollMs: 500,
    });
    expect(result.materialized).toBe(true);
    expect(onDataless).toHaveBeenCalledTimes(1);
    expect(checkFn).toHaveBeenCalledTimes(3);
  });

  it("gives up after timeoutMs and reports not materialized, without hanging", async () => {
    const checkFn = vi.fn().mockResolvedValue(true); // 永远 dataless
    let fakeNow = 0;
    const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => fakeNow);
    const sleepFn = async (ms) => {
      fakeNow += ms;
    };
    const result = await waitForMaterialize("/fake/path.jpg", {
      checkFn,
      sleepFn,
      timeoutMs: 2000,
      pollMs: 500,
    });
    expect(result.materialized).toBe(false);
    expect(result.waitedMs).toBe(2000);
    nowSpy.mockRestore();
  });

  it(
    "bounds a hanging onDataless call so it cannot block progress",
    async () => {
      let calls = 0;
      const checkFn = vi.fn().mockImplementation(async () => {
        calls++;
        return calls < 2; // dataless once, materialized on the second check
      });
      // Simulates a real `brctl download` wrapper that hangs forever
      // (no default timeout on execFileAsync) — this must never block
      // waitForMaterialize from making progress.
      const onDataless = vi.fn().mockImplementation(() => new Promise(() => {}));
      const sleepFn = vi.fn().mockResolvedValue(undefined); // resolves instantly
      const result = await waitForMaterialize("/fake/path.jpg", {
        checkFn,
        sleepFn,
        onDataless,
        timeoutMs: 2000,
        pollMs: 500,
      });
      expect(result.materialized).toBe(true);
      expect(onDataless).toHaveBeenCalledTimes(1);
    },
    1000, // vitest test timeout: proves this resolves fast, not just "eventually"
  );
});
