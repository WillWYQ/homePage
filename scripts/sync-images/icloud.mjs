// scripts/sync-images/icloud.mjs
// 呼应 memory icloud-drive-build-hazard:brctl download 对孤立(orphaned)文件
// 不生效,真正兜底的是"超时就跳过",不是这个调用本身。isDataless/waitForMaterialize
// 只做纯逻辑,真实的 `ls -lO`/`brctl download` 由调用方(scripts/sync-images.mjs)
// 通过 checkFn/onDataless 注入,这里不直接 shell out,方便测试。
//
// onDataless 本身也被限时(默认与 timeoutMs 共享同一预算,可用
// onDatalessTimeoutMs 单独指定):Task 9 计划用 execFileAsync 包一层
// `brctl download`,execFileAsync 本身没有默认超时,如果那次调用卡住,
// 不能连带拖垮/阻塞整个 waitForMaterialize——真正兜底的仍然是下面的
// 轮询循环,不依赖 onDataless 一定会 resolve。

export function isDataless(lsOutput) {
  return lsOutput.includes("dataless");
}

export async function waitForMaterialize(
  path,
  {
    timeoutMs = 15000,
    pollMs = 500,
    checkFn,
    sleepFn,
    onDataless,
    onDatalessTimeoutMs,
  } = {},
) {
  if (!checkFn) throw new Error("waitForMaterialize requires a checkFn");
  const sleep = sleepFn || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));

  let dataless = await checkFn(path);
  if (!dataless) return { materialized: true, waitedMs: 0 };

  if (onDataless) {
    // 用注入的 sleep 给 onDataless 设一个上限:它本身如果卡住(比如 brctl
    // download 挂起),不能拖慢/阻塞整体超时窗口——真正的超时兜底是下面的
    // 轮询循环,不依赖 onDataless 一定会 resolve。
    const bound = onDatalessTimeoutMs ?? timeoutMs;
    await Promise.race([onDataless(path), sleep(bound)]);
  }

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
