#!/usr/bin/env node
// scripts/sync-images.mjs — 图片同步管线 CLI 入口(spec §4)。
// 只做编排:iCloud 检查 → resize/blur/exif → R2 上传/manifest 写入。
// 各阶段的纯逻辑分别在 scripts/sync-images/*.mjs,已各自单元测试覆盖。

import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { S3Client } from "@aws-sdk/client-s3";
import matter from "gray-matter";
import { contentHash } from "./sync-images/hash.mjs";
import { isDataless, waitForMaterialize } from "./sync-images/icloud.mjs";
import { resizeTiers, buildBlur, extractExif } from "./sync-images/process-image.mjs";
import {
  readManifest,
  mergeManifest,
  writeManifest,
  diffForDryRun,
} from "./sync-images/manifest.mjs";
import { checkCredentials, uploadTier } from "./sync-images/r2-upload.mjs";

const execFileAsync = promisify(execFile);

const CONTENT_DIR = path.join(process.cwd(), "content", "photos");
const MANIFEST_PATH = path.join(process.cwd(), "content", "image-manifest.json");
const IMAGE_RE = /\.(jpe?g|png|webp|heic)$/i;

function parseArgs(argv) {
  const dryRun = argv.includes("--dry-run");
  const rolls = argv.filter((a) => a !== "--dry-run");
  return { dryRun, rolls };
}

function listCandidateFiles(rolls) {
  const rollDirs = rolls.length
    ? rolls
    : fs
        .readdirSync(CONTENT_DIR)
        .filter((name) => fs.statSync(path.join(CONTENT_DIR, name)).isDirectory());
  const files = [];
  for (const roll of rollDirs) {
    const rollPath = path.join(CONTENT_DIR, roll);
    for (const file of fs.readdirSync(rollPath)) {
      if (IMAGE_RE.test(file)) {
        files.push({
          roll,
          file,
          absPath: path.join(rollPath, file),
          source: `photos/${roll}/${file}`,
        });
      }
    }
  }
  return files;
}

/** 卷(roll)的 index.md frontmatter date(spec §4.5 tier 2)。宽容处理:文件缺失或
 * date 字段缺失都返回 undefined,不抛出——这里不做 zod 校验,那是 lib/content.ts
 * 在 Next build 时的职责,这里只是尽力而为的日期读取。 */
function readRollFrontmatterDate(roll) {
  try {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, roll, "index.md"), "utf8");
    const { data } = matter(raw);
    return data?.date;
  } catch {
    return undefined;
  }
}

/** iCloud 检查(spec §4.2):真实的 ls -lO / brctl download 只在这里 shell out,
 * 逻辑本身在 icloud.mjs 已测试过,这里只是接线。 */
async function checkIcloud(absPath) {
  const timeoutMs = Number(process.env.SYNC_ICLOUD_TIMEOUT_MS) || 15000;
  const { stdout } = await execFileAsync("ls", ["-lO", absPath]);
  if (!isDataless(stdout)) return { materialized: true, waitedMs: 0 };
  return waitForMaterialize(absPath, {
    timeoutMs,
    checkFn: async (p) => {
      const { stdout: out } = await execFileAsync("ls", ["-lO", p]);
      return isDataless(out);
    },
    onDataless: async (p) => {
      try {
        await execFileAsync("brctl", ["download", p]);
      } catch {
        // brctl 对孤立文件本身可能失败或无效——真正兜底的是外层的超时(§4.2)
      }
    },
  });
}

async function buildEntry(candidate, frontmatterDate) {
  const buffer = fs.readFileSync(candidate.absPath);
  const id = contentHash(buffer);
  const { width, height, tiers } = await resizeTiers(buffer);
  if (tiers.length === 0) {
    console.warn(
      `⚠ skipped ${candidate.source}: narrower than smallest tier (480px), nothing to serve`,
    );
    return null;
  }
  const { blurhash, blurDataUrl } = await buildBlur(buffer);
  const stat = fs.statSync(candidate.absPath);
  const { exif, takenAt } = await extractExif(buffer, { frontmatterDate, fileMtime: stat.mtime });
  return {
    source: candidate.source,
    entry: { id, roll: candidate.roll, takenAt, width, height, blurhash, blurDataUrl, exif },
    tiers,
  };
}

async function main() {
  const { dryRun, rolls } = parseArgs(process.argv.slice(2));
  const candidates = listCandidateFiles(rolls);
  const existingManifest = readManifest(MANIFEST_PATH);

  if (!dryRun) {
    const { ok, missing } = checkCredentials();
    if (!ok) {
      console.error(
        `✗ missing R2 credentials: ${missing.join(", ")}\n` +
          "  configure them per docs/superpowers/specs/2026-08-21-photos-darkroom-design.md §5, " +
          "or re-run with --dry-run.",
      );
      process.exitCode = 1;
      return;
    }
  }

  const rollDates = new Map();
  const built = [];
  for (const candidate of candidates) {
    const icloudResult = await checkIcloud(candidate.absPath);
    if (!icloudResult.materialized) {
      console.warn(
        `⚠ skipped ${candidate.source}: still dataless after ${icloudResult.waitedMs}ms ` +
          "(see memory icloud-drive-build-hazard — orphaned iCloud files may need re-download from another device)",
      );
      continue;
    }
    if (!rollDates.has(candidate.roll)) {
      rollDates.set(candidate.roll, readRollFrontmatterDate(candidate.roll));
    }
    const built1 = await buildEntry(candidate, rollDates.get(candidate.roll));
    if (built1) built.push(built1);
  }

  const diff = diffForDryRun(
    existingManifest,
    built.map((b) => ({ source: b.source, id: b.entry.id })),
  );

  if (dryRun) {
    for (const source of diff.skip) console.log(`= ${source}: already in manifest, would skip`);
    for (const item of built) {
      if (!diff.pending.includes(item.source)) continue;
      console.log(`+ ${item.source}: would process & upload`);
      console.log(`  ${JSON.stringify(item.entry, null, 2).split("\n").join("\n  ")}`);
    }
    return;
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  const updates = {};
  for (const item of built) {
    if (diff.skip.includes(item.source)) continue; // 内容未变,跳过整组四档的重新上传
    const sizes = {};
    for (const tier of item.tiers) {
      const key = `${item.entry.id}-${tier.width}.webp`;
      await uploadTier(client, {
        bucket: process.env.R2_BUCKET,
        key,
        body: tier.buffer,
        contentType: "image/webp",
      });
      sizes[String(tier.width)] = `${process.env.R2_PUBLIC_BASE_URL}/${key}`;
    }
    updates[item.source] = { ...item.entry, sizes };
  }

  const merged = mergeManifest(existingManifest, updates);
  writeManifest(MANIFEST_PATH, merged);
  const n = Object.keys(updates).length;
  console.log(`✓ wrote ${n} updated entr${n === 1 ? "y" : "ies"} to ${MANIFEST_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
