// scripts/sync-images/icloud.mjs
// 呼应 memory icloud-drive-build-hazard:brctl download 对孤立(orphaned)文件
// 不生效,真正兜底的是"超时就跳过",不是这个调用本身。isDataless/waitForMaterialize
// 只做纯逻辑,真实的 `ls -lO`/`brctl download` 由调用方(scripts/sync-images.mjs)
// 通过 checkFn/onDataless 注入,这里不直接 shell out,方便测试。

export function isDataless(lsOutput) {
  return lsOutput.includes("dataless");
}

export async function waitForMaterialize(
  path,
  { timeoutMs = 15000, pollMs = 500, checkFn, sleepFn, onDataless } = {},
) {
  if (!checkFn) throw new Error("waitForMaterialize requires a checkFn");
  const sleep = sleepFn || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));

  let dataless = await checkFn(path);
  if (!dataless) return { materialized: true, waitedMs: 0 };

  if (onDataless) await onDataless(path);

  const start = Date.now();
  while (dataless) {
    if (Date.now() - start >= timeoutMs) {
      return { materialized: false, waitedMs: Date.now() - start };
    }
    await sleep(pollMs);
    dataless = await checkFn(path);
  }
  return { materialized: true, waitedMs: Date.now() - start };
}
