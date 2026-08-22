// scripts/sync-images/manifest.mjs
import fs from "node:fs";
import path from "node:path";

export function readManifest(manifestPath) {
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    return {};
  }
}

/** 合并不是覆盖(spec §4.6):已存在但这次没扫到的条目原样保留。 */
export function mergeManifest(existing, updates) {
  return { ...existing, ...updates };
}

export function writeManifest(manifestPath, manifest) {
  const sorted = Object.keys(manifest)
    .sort()
    .reduce((acc, key) => {
      acc[key] = manifest[key];
      return acc;
    }, {});
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(sorted, null, 2) + "\n", "utf8");
}

/**
 * dry-run 幂等信号(spec §4.1):按内容哈希比对现有 manifest,不写任何文件——
 * 只要输入不变,两次调用的分类逐行相同。
 */
export function diffForDryRun(existing, candidates) {
  const skip = [];
  const pending = [];
  for (const candidate of candidates) {
    const entry = existing[candidate.source];
    if (entry && entry.id === candidate.id) {
      skip.push(candidate.source);
    } else {
      pending.push(candidate.source);
    }
  }
  return { skip, pending };
}
