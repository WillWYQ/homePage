# /photos 暗房 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 `scripts/sync-images.mjs` 图片同步管线(iCloud 检测、resize、blurhash、EXIF、R2 上传)与 `/photos` 暗房页面(瀑布流索引 + 内嵌灯箱),用占位图跑通全流程;真实 R2 凭据与真实照片留给用户后续自行配置。

**Architecture:** 同步脚本拆成 5 个纯函数模块(`scripts/sync-images/{hash,icloud,process-image,manifest,r2-upload}.mjs`)+ 1 个 CLI 编排入口(`scripts/sync-images.mjs`),每个模块独立可测、可注入依赖(时钟、S3 client、exifr)。内容读取层新增 `lib/content-schema.ts`(zod)与 `lib/content.ts` 的 `getPhotoRolls()`/`getPhotoRoll()`(异步,因 dev 模式回落需要现读图片尺寸)。页面是一个 Server Component(`app/photos/page.tsx`)+ 一个 client 组件(`components/photos/photo-darkroom.tsx`,瀑布流 + 灯箱状态)。

**Tech Stack:** Next.js 16 static export、TypeScript strict、Tailwind v4、`sharp`/`blurhash`/`exifr`/`@aws-sdk/client-s3`/`zod`(新增依赖)、`vitest`(本仓库第一个测试框架)。

**Spec:** [docs/superpowers/specs/2026-08-21-photos-darkroom-design.md](../specs/2026-08-21-photos-darkroom-design.md)(已经过 subagent 审查修复,§ 编号以该文件为准)。

## Global Constraints

- **包管理用 pnpm**(`packageManager: pnpm@11.17.0`),不要动 `package-lock.json`。
- **单一强调色** 终端绿 `#22c55e` / Tailwind `green-500`;灰阶只用 `white / white/70 / white/40`(交互 mono `white/60`)。
- **不许假(全仓库红线):** 数据缺失一律 `null`/整段省略,绝不伪造占位数字或指向不存在资源的 URL——本计划里最直接的体现是 §4.6(无 R2 凭据拒绝写 manifest)与 §6.4(manifest 未命中的帧生产模式下直接剔除)。
- **iCloud 构建隐患:** 任何卡住先怀疑 iCloud dataless 文件(memory `icloud-drive-build-hazard`);本计划 Task 3 就是这个隐患的直接修复对象。
- **R2 未配置是预期状态:** 本计划全程不需要真实 R2 凭据也能完成全部任务的验证(`--dry-run` 与单元测试的 mock S3 client 覆盖了这一点)。
- **双站门控:** `app/photos/page.tsx` 遵循 `isWillsleep` 分支 + 双写 `metadata`,与 `app/now/page.tsx`/`app/about/page.tsx` 同构。
- **`lib/rooms.ts` 里 `photos.open` 本计划不动**,继续保持 `false`(spec §0/§10:内容上线是用户后续操作,不在本计划范围)。
- **验收 = `npx tsc --noEmit` + `pnpm lint` + `pnpm test` + `pnpm build:willsleep` + `pnpm build:yueqiao`**(Task 15 统一跑一遍)。
- **提交:** 每个任务收尾单独 commit,`feat:`/`test:` 前缀,结尾带 `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`。

---

## 文件结构(本计划结束时)

**新建:**
- `vitest.config.ts` — 测试框架最小配置
- `scripts/sync-images/hash.mjs` — 内容哈希
- `scripts/sync-images/hash.test.mjs`
- `scripts/sync-images/icloud.mjs` — dataless 检测 + 轮询降级
- `scripts/sync-images/icloud.test.mjs`
- `scripts/sync-images/process-image.mjs` — resize / blurhash+blurDataUrl / EXIF
- `scripts/sync-images/process-image.test.mjs`
- `scripts/sync-images/manifest.mjs` — 读/合并/写 manifest + dry-run diff
- `scripts/sync-images/manifest.test.mjs`
- `scripts/sync-images/r2-upload.mjs` — 凭据检查 + 幂等上传(S3 client 可注入)
- `scripts/sync-images/r2-upload.test.mjs`
- `scripts/sync-images.mjs` — CLI 编排入口
- `lib/content-schema.ts` — `photoSetSchema`(zod)
- `lib/content-schema.test.ts`
- `lib/content.test.ts` — `getPhotoRolls`/`getPhotoRoll` 的 fixture 测试(新文件,本仓库 `lib/content.ts` 此前没有测试)
- `components/photos/photo-darkroom.tsx` — 瀑布流 + 灯箱(client component)

**修改:**
- `package.json` — 新增 5 个 dependencies + 1 个 devDependency + 2 个 scripts
- `.gitignore` — `content/photos/**` 图片忽略规则 + `/public/_dev-photos`
- `lib/content.ts` — 新增 `PhotoExif`/`PhotoFrame`/`PhotoRoll` 类型 + `getPhotoRolls()`/`getPhotoRoll()`;文件头注释的"第 3 期"改"第 4 期"(stale 标签修正)
- `app/photos/page.tsx` — 从占位/不存在变为真实实现
- `docs/DESIGN.md` — §4 脚手架小节标题的"第 3 期"改"第 4 期";§9 期3 完成标准部分打勾
- `docs/BUILD-LOG.md` — 期3 状态行四格更新

**不碰:** `lib/rooms.ts`(`photos.open` 维持 `false`)、`lib/i18n/strings.ts`(本页无需新增文案,见 Task 13 说明)、`components/room-shell.tsx`/`components/room-header.tsx`(直接复用,无需修改)、`app/sitemap.ts`(`photos.open` 为 `false` 期间路由不会被收录,现有逻辑已经通用)。

---

## Task 1: 项目脚手架 — 依赖、vitest、gitignore、npm scripts

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: `pnpm test` 命令(`vitest run`)、`pnpm sync:images` 命令(占位,Task 9 才有真实内容可跑)、`sharp`/`blurhash`/`exifr`/`@aws-sdk/client-s3`/`zod` 在后续任务里可直接 `import`。

这是纯 scaffolding 任务,没有 TDD 红绿循环——用"vitest 能找到并跑空测试套件"作为验收信号,真正的第一个测试在 Task 2。

- [ ] **Step 1: 安装依赖**

```bash
pnpm add sharp blurhash exifr @aws-sdk/client-s3 zod
pnpm add -D vitest
```

- [ ] **Step 2: 写 `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.{ts,mts,mjs}"],
    exclude: ["node_modules", ".next", "out"],
  },
});
```

- [ ] **Step 3: `package.json` 新增 scripts**

在现有 `scripts` 块里加两行(紧跟 `"typecheck"` 之后):

```json
    "typecheck": "tsc --noEmit",
    "sync:images": "node scripts/sync-images.mjs",
    "test": "vitest run"
```

- [ ] **Step 4: `.gitignore` 追加**

在文件末尾追加:

```gitignore

# content/photos 原图 gitignore,家在 R2(DESIGN §4 约定 4)——
# 但组说明/翻译 markdown 要入库
content/photos/**/*
!content/photos/**/
!content/photos/**/index.md
!content/photos/**/index.zh.md
!content/photos/**/index.en.md

# dev 模式本地图片回落用的符号链接(photos darkroom spec §6.4)
/public/_dev-photos
```

- [ ] **Step 5: 验证 vitest 已接入**

Run: `pnpm test`
Expected: vitest 启动成功,报告 "No test files found"(退出码非 0 属预期——Task 2 会加入第一个真实测试文件,这里只确认命令本身能跑通、不是命令缺失或配置报错)。

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml .gitignore vitest.config.ts
git commit -m "feat: add photos-darkroom dependencies and vitest test runner

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: `scripts/sync-images/hash.mjs` — 内容哈希

**Files:**
- Create: `scripts/sync-images/hash.mjs`
- Test: `scripts/sync-images/hash.test.mjs`

**Interfaces:**
- Produces: `contentHash(buffer: Buffer): string` — sha256 前 10 位 hex,供 Task 4(resize 时算 `id`)与 Task 7(manifest 内容比对)使用。

- [ ] **Step 1: 写测试**

```js
// scripts/sync-images/hash.test.mjs
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
```

- [ ] **Step 2: 运行测试,确认失败**

Run: `npx vitest run scripts/sync-images/hash.test.mjs`
Expected: FAIL — `Cannot find module './hash.mjs'`(文件还不存在)。

- [ ] **Step 3: 写实现**

```js
// scripts/sync-images/hash.mjs
import { createHash } from "node:crypto";

export function contentHash(buffer) {
  return createHash("sha256").update(buffer).digest("hex").slice(0, 10);
}
```

- [ ] **Step 4: 运行测试,确认通过**

Run: `npx vitest run scripts/sync-images/hash.test.mjs`
Expected: PASS,3/3。

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-images/hash.mjs scripts/sync-images/hash.test.mjs
git commit -m "feat(sync-images): content hash for idempotent filenames (spec §4.3)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: `scripts/sync-images/icloud.mjs` — dataless 检测与超时降级

**Files:**
- Create: `scripts/sync-images/icloud.mjs`
- Test: `scripts/sync-images/icloud.test.mjs`

**Interfaces:**
- Produces: `isDataless(lsOutput: string): boolean`;`waitForMaterialize(path: string, opts: { timeoutMs?: number, pollMs?: number, checkFn: (path: string) => Promise<boolean>, sleepFn?: (ms: number) => Promise<void>, onDataless?: (path: string) => Promise<void> }): Promise<{ materialized: boolean, waitedMs: number }>`。Task 9 的 CLI 入口会用真实 `ls -lO`/`brctl download` 实现 `checkFn`/`onDataless`;这里的测试全部注入假的时钟与假的 checkFn,不碰真实文件系统、不真的等待。

- [ ] **Step 1: 写测试**

```js
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
});
```

- [ ] **Step 2: 运行测试,确认失败**

Run: `npx vitest run scripts/sync-images/icloud.test.mjs`
Expected: FAIL — 模块不存在。

- [ ] **Step 3: 写实现**

```js
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
```

- [ ] **Step 4: 运行测试,确认通过**

Run: `npx vitest run scripts/sync-images/icloud.test.mjs`
Expected: PASS,5/5。

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-images/icloud.mjs scripts/sync-images/icloud.test.mjs
git commit -m "feat(sync-images): iCloud dataless detection with injectable timeout (spec §4.2)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: `scripts/sync-images/process-image.mjs` — `resizeTiers`

**Files:**
- Create: `scripts/sync-images/process-image.mjs`
- Test: `scripts/sync-images/process-image.test.mjs`

**Interfaces:**
- Produces: `SIZE_LADDER = [480, 960, 1600, 2400]`;`resizeTiers(buffer: Buffer, widths = SIZE_LADDER): Promise<{ width: number, height: number, tiers: { width: number, buffer: Buffer }[] }>`。原图宽度小于某档时跳过该档(不放大,spec §4.3);全部档位都被跳过时 `tiers` 为空数组(空数组本身是正确信号,"整张图不写 manifest 条目"的判断留给 Task 9 的编排层做,这里只负责如实报告)。
- Consumes: `sharp`(Task 1 已装)。

测试用 `sharp` 现场合成纯色图片作为 fixture,不需要检入任何二进制图片文件。

- [ ] **Step 1: 写测试**

```js
// scripts/sync-images/process-image.test.mjs
import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { resizeTiers, SIZE_LADDER } from "./process-image.mjs";

async function makeFixture(width, height) {
  return sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 50, b: 50 } },
  })
    .png()
    .toBuffer();
}

describe("resizeTiers", () => {
  it("produces every tier for a source image larger than all tiers", async () => {
    const buffer = await makeFixture(3000, 2000);
    const { width, height, tiers } = await resizeTiers(buffer);
    expect(width).toBe(3000);
    expect(height).toBe(2000);
    expect(tiers.map((t) => t.width)).toEqual(SIZE_LADDER);
    for (const tier of tiers) {
      const meta = await sharp(tier.buffer).metadata();
      expect(meta.width).toBe(tier.width);
      expect(meta.format).toBe("webp");
    }
  });

  it("skips tiers wider than the source instead of upscaling", async () => {
    const buffer = await makeFixture(700, 500);
    const { tiers } = await resizeTiers(buffer);
    expect(tiers.map((t) => t.width)).toEqual([480]);
  });

  it("returns an empty tiers array when the source is narrower than the smallest tier", async () => {
    const buffer = await makeFixture(300, 200);
    const { tiers } = await resizeTiers(buffer);
    expect(tiers).toEqual([]);
  });
});
```

- [ ] **Step 2: 运行测试,确认失败**

Run: `npx vitest run scripts/sync-images/process-image.test.mjs`
Expected: FAIL — 模块不存在。

- [ ] **Step 3: 写实现**

```js
// scripts/sync-images/process-image.mjs
import sharp from "sharp";

export const SIZE_LADDER = [480, 960, 1600, 2400];

/** 不放大(spec §4.3):原图窄于某档就跳过该档,不做插值放大出虚假清晰度。 */
export async function resizeTiers(buffer, widths = SIZE_LADDER) {
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width;
  const height = metadata.height;

  const tiers = [];
  for (const targetWidth of widths) {
    if (targetWidth > width) continue;
    const resized = await sharp(buffer)
      .resize({ width: targetWidth })
      .webp({ quality: 82 })
      .toBuffer();
    tiers.push({ width: targetWidth, buffer: resized });
  }
  return { width, height, tiers };
}
```

- [ ] **Step 4: 运行测试,确认通过**

Run: `npx vitest run scripts/sync-images/process-image.test.mjs`
Expected: PASS,3/3。

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-images/process-image.mjs scripts/sync-images/process-image.test.mjs
git commit -m "feat(sync-images): webp resize ladder, no-upscale rule (spec §4.3)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: `scripts/sync-images/process-image.mjs` — `buildBlur`

**Files:**
- Modify: `scripts/sync-images/process-image.mjs`
- Test: `scripts/sync-images/process-image.test.mjs`

**Interfaces:**
- Produces: `buildBlur(buffer: Buffer): Promise<{ blurhash: string | null, blurDataUrl: string | null }>`。`blurDataUrl` 是预渲染的小尺寸 PNG data URL(spec §4.4:blurhash encode → decode 回像素 → sharp raw→PNG,全程不额外引入 canvas 依赖,`sharp` 已经在依赖里)。失败时两个字段都是 `null`,不抛异常。
- Consumes: `blurhash` 包的 `encode`/`decode`(Task 1 已装)、本任务新增的 `makeFixture` 测试辅助函数(与 Task 4 共享,已在同一测试文件里)。

- [ ] **Step 1: 在 `process-image.test.mjs` 追加测试**

```js
// 追加到 scripts/sync-images/process-image.test.mjs,import 行改为:
// import { resizeTiers, buildBlur, SIZE_LADDER } from "./process-image.mjs";

describe("buildBlur", () => {
  it("produces a blurhash string and a matching PNG data URL", async () => {
    const buffer = await makeFixture(200, 150);
    const { blurhash, blurDataUrl } = await buildBlur(buffer);
    expect(typeof blurhash).toBe("string");
    expect(blurhash.length).toBeGreaterThan(0);
    expect(blurDataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it("returns nulls instead of throwing on unusable input", async () => {
    const { blurhash, blurDataUrl } = await buildBlur(Buffer.from("not an image"));
    expect(blurhash).toBeNull();
    expect(blurDataUrl).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试,确认失败**

Run: `npx vitest run scripts/sync-images/process-image.test.mjs`
Expected: FAIL — `buildBlur is not a function`(前两个 `resizeTiers` 用例仍应通过)。

- [ ] **Step 3: 在 `process-image.mjs` 追加实现**

```js
// 追加到 scripts/sync-images/process-image.mjs 顶部 import:
import { encode, decode } from "blurhash";

// 追加到文件末尾:

/**
 * blurhash 字符串 + 预渲染的 PNG data URL(spec §4.4)。只在 sync 脚本里算一次,
 * lib/content.ts 读取时直接透传 blurDataUrl,不在页面渲染路径上重新解码。
 */
export async function buildBlur(buffer) {
  try {
    const { data, info } = await sharp(buffer)
      .resize({ width: 32, height: 32, fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const hash = encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4);
    const pixels = decode(hash, info.width, info.height);
    const png = await sharp(Buffer.from(pixels), {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .png()
      .toBuffer();

    return {
      blurhash: hash,
      blurDataUrl: `data:image/png;base64,${png.toString("base64")}`,
    };
  } catch {
    return { blurhash: null, blurDataUrl: null };
  }
}
```

- [ ] **Step 4: 运行测试,确认通过**

Run: `npx vitest run scripts/sync-images/process-image.test.mjs`
Expected: PASS,5/5(含 Task 4 的 3 个)。

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-images/process-image.mjs scripts/sync-images/process-image.test.mjs
git commit -m "feat(sync-images): blurhash + precomputed blurDataUrl (spec §4.4)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: `scripts/sync-images/process-image.mjs` — `extractExif`

**Files:**
- Modify: `scripts/sync-images/process-image.mjs`
- Test: `scripts/sync-images/process-image.test.mjs`

**Interfaces:**
- Produces: `extractExif(buffer: Buffer, { frontmatterDate?: string | Date, fileMtime?: Date } = {}): Promise<{ exif: { camera?: string, lens?: string, iso?: number, aperture?: number, shutter?: string, focal?: number } | null, takenAt: string | null }>`。`takenAt` 回落链:EXIF `DateTimeOriginal` → `frontmatterDate` → `fileMtime` → `null`(spec §4.5)。
- Consumes: `exifr` 包(Task 1 已装),测试里用 `vi.mock("exifr", ...)` 替身,不依赖真实带 EXIF 的图片文件。

- [ ] **Step 1: 在 `process-image.test.mjs` 顶部加 mock,追加测试**

```js
// process-image.test.mjs 顶部,import 之前:
import { vi } from "vitest";

vi.mock("exifr", () => ({
  default: { parse: vi.fn() },
}));

// import 行改为:
// import exifr from "exifr";
// import { resizeTiers, buildBlur, extractExif, SIZE_LADDER } from "./process-image.mjs";

describe("extractExif", () => {
  it("maps parsed EXIF fields and formats shutter speed as a fraction", async () => {
    exifr.parse.mockResolvedValueOnce({
      Model: "X100V",
      LensModel: "23mm f/2",
      ISO: 640,
      FNumber: 2,
      ExposureTime: 1 / 250,
      FocalLength: 23,
      DateTimeOriginal: new Date("2026-06-30T19:42:00+08:00"),
    });
    const { exif, takenAt } = await extractExif(Buffer.from("fake"), {});
    expect(exif).toEqual({
      camera: "X100V",
      lens: "23mm f/2",
      iso: 640,
      aperture: 2,
      shutter: "1/250",
      focal: 23,
    });
    expect(takenAt).toBe(new Date("2026-06-30T19:42:00+08:00").toISOString());
  });

  it("falls back to frontmatter date when EXIF has no capture time", async () => {
    exifr.parse.mockResolvedValueOnce(null);
    const { exif, takenAt } = await extractExif(Buffer.from("fake"), {
      frontmatterDate: "2026-06-30",
    });
    expect(exif).toBeNull();
    expect(takenAt).toBe(new Date("2026-06-30").toISOString());
  });

  it("falls back to file mtime when EXIF and frontmatter date are both absent", async () => {
    exifr.parse.mockResolvedValueOnce(null);
    const mtime = new Date("2026-05-01T00:00:00Z");
    const { takenAt } = await extractExif(Buffer.from("fake"), { fileMtime: mtime });
    expect(takenAt).toBe(mtime.toISOString());
  });

  it("returns nulls for both when no source has a date", async () => {
    exifr.parse.mockResolvedValueOnce(null);
    const { exif, takenAt } = await extractExif(Buffer.from("fake"), {});
    expect(exif).toBeNull();
    expect(takenAt).toBeNull();
  });

  it("returns exif:null instead of throwing when parsing itself fails", async () => {
    exifr.parse.mockRejectedValueOnce(new Error("bad format"));
    const { exif, takenAt } = await extractExif(Buffer.from("fake"), {});
    expect(exif).toBeNull();
    expect(takenAt).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试,确认失败**

Run: `npx vitest run scripts/sync-images/process-image.test.mjs`
Expected: FAIL — `extractExif is not a function`(之前 5 个测试仍通过)。

- [ ] **Step 3: 在 `process-image.mjs` 追加实现**

```js
// 追加到 scripts/sync-images/process-image.mjs 顶部 import:
import exifr from "exifr";

// 追加到文件末尾:

function formatShutter(exposureTime) {
  if (typeof exposureTime !== "number" || exposureTime <= 0) return undefined;
  if (exposureTime >= 1) return `${exposureTime}s`;
  return `1/${Math.round(1 / exposureTime)}`;
}

/** EXIF 提取 + takenAt 三层回落(spec §4.5)。选 exifr(纯 JS)而不是系统 exiftool
 * 二进制:不给本机再加一个"有没有装某个命令行工具"的隐性依赖(呼应 §4.2 的 iCloud 教训)。 */
export async function extractExif(buffer, { frontmatterDate, fileMtime } = {}) {
  let raw = null;
  try {
    raw = await exifr.parse(buffer, {
      pick: [
        "Make",
        "Model",
        "LensModel",
        "ISO",
        "FNumber",
        "ExposureTime",
        "FocalLength",
        "DateTimeOriginal",
      ],
    });
  } catch {
    raw = null;
  }

  const exif = raw
    ? {
        camera: raw.Model || undefined,
        lens: raw.LensModel || undefined,
        iso: typeof raw.ISO === "number" ? raw.ISO : undefined,
        aperture: typeof raw.FNumber === "number" ? raw.FNumber : undefined,
        shutter: formatShutter(raw.ExposureTime),
        focal: typeof raw.FocalLength === "number" ? raw.FocalLength : undefined,
      }
    : null;
  const hasAnyField = exif && Object.values(exif).some((v) => v !== undefined);

  const takenAt =
    (raw?.DateTimeOriginal instanceof Date ? raw.DateTimeOriginal.toISOString() : null) ||
    (frontmatterDate ? new Date(frontmatterDate).toISOString() : null) ||
    (fileMtime ? new Date(fileMtime).toISOString() : null) ||
    null;

  return { exif: hasAnyField ? exif : null, takenAt };
}
```

- [ ] **Step 4: 运行测试,确认通过**

Run: `npx vitest run scripts/sync-images/process-image.test.mjs`
Expected: PASS,10/10。

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-images/process-image.mjs scripts/sync-images/process-image.test.mjs
git commit -m "feat(sync-images): exifr extraction with three-tier takenAt fallback (spec §4.5)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: `scripts/sync-images/manifest.mjs` — 读/合并/写 + dry-run diff

**Files:**
- Create: `scripts/sync-images/manifest.mjs`
- Test: `scripts/sync-images/manifest.test.mjs`

**Interfaces:**
- Produces: `readManifest(manifestPath): object`(文件不存在返回 `{}`);`mergeManifest(existing, updates): object`(浅合并,不存在的 key 保留);`writeManifest(manifestPath, manifest): void`(key 排序后写,`JSON.stringify(..., null, 2)`);`diffForDryRun(existing, candidates: { source: string, id: string }[]): { skip: string[], pending: string[] }`(内容哈希比对,spec §4.1 的幂等信号来源)。

- [ ] **Step 1: 写测试**

```js
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
```

- [ ] **Step 2: 运行测试,确认失败**

Run: `npx vitest run scripts/sync-images/manifest.test.mjs`
Expected: FAIL — 模块不存在。

- [ ] **Step 3: 写实现**

```js
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
```

- [ ] **Step 4: 运行测试,确认通过**

Run: `npx vitest run scripts/sync-images/manifest.test.mjs`
Expected: PASS,5/5。

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-images/manifest.mjs scripts/sync-images/manifest.test.mjs
git commit -m "feat(sync-images): manifest read/merge/write + dry-run idempotency diff (spec §4.1/§4.6)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: `scripts/sync-images/r2-upload.mjs` — 凭据检查 + 幂等上传

**Files:**
- Create: `scripts/sync-images/r2-upload.mjs`
- Test: `scripts/sync-images/r2-upload.test.mjs`

**Interfaces:**
- Produces: `checkCredentials(env = process.env): { ok: boolean, missing: string[] }`;`uploadTier(client, { bucket, key, body, contentType }): Promise<{ uploaded: boolean }>`(`HeadObjectCommand` 命中即跳过,不存在才 `PutObjectCommand`,`CacheControl: "public, max-age=31536000, immutable"`,spec §4.6)。
- Consumes: `@aws-sdk/client-s3` 的 `HeadObjectCommand`/`PutObjectCommand`(Task 1 已装);`client` 参数是任意有 `.send()` 方法的对象,测试注入 mock,不连真实 R2。

- [ ] **Step 1: 写测试**

```js
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
```

- [ ] **Step 2: 运行测试,确认失败**

Run: `npx vitest run scripts/sync-images/r2-upload.test.mjs`
Expected: FAIL — 模块不存在。

- [ ] **Step 3: 写实现**

```js
// scripts/sync-images/r2-upload.mjs
import { HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const REQUIRED_ENV_VARS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_BASE_URL",
];

export function checkCredentials(env = process.env) {
  const missing = REQUIRED_ENV_VARS.filter((key) => !env[key]);
  return { ok: missing.length === 0, missing };
}

/** HeadObject 先问 R2 权威状态是否已存在,存在即跳过——幂等的实际实现方式,
 * 不是"本地记录一份哈希清单"(spec §4.6)。 */
export async function uploadTier(client, { bucket, key, body, contentType }) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return { uploaded: false };
  } catch (err) {
    if (err?.name !== "NotFound" && err?.$metadata?.httpStatusCode !== 404) throw err;
  }
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return { uploaded: true };
}
```

- [ ] **Step 4: 运行测试,确认通过**

Run: `npx vitest run scripts/sync-images/r2-upload.test.mjs`
Expected: PASS,4/4。

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-images/r2-upload.mjs scripts/sync-images/r2-upload.test.mjs
git commit -m "feat(sync-images): R2 credential check + HeadObject-gated idempotent upload (spec §4.6)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 9: `scripts/sync-images.mjs` — CLI 编排入口

**Files:**
- Create: `scripts/sync-images.mjs`

**Interfaces:**
- Consumes: Task 2-8 的全部模块导出。
- Produces: `pnpm sync:images [--dry-run] [roll-slug ...]` 命令行为(spec §4.1)。

这是编排/胶水代码,不做隔离单元测试(Task 2-8 已经覆盖全部纯逻辑);验证方式是对着真实占位图跑一遍,人工核对输出。

- [ ] **Step 1: 写实现**

```js
#!/usr/bin/env node
// scripts/sync-images.mjs — 图片同步管线 CLI 入口(spec §4)。
// 只做编排:iCloud 检查 → resize/blur/exif → R2 上传/manifest 写入。
// 各阶段的纯逻辑分别在 scripts/sync-images/*.mjs,已各自单元测试覆盖。

import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { S3Client } from "@aws-sdk/client-s3";
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

async function buildEntry(candidate) {
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
  const { exif, takenAt } = await extractExif(buffer, { fileMtime: stat.mtime });
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
    const built1 = await buildEntry(candidate);
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
```

- [ ] **Step 2: 生成占位测试素材(不入库,`content/photos/**` 已被 Task 1 的 gitignore 规则覆盖)**

```bash
node -e '
import("sharp").then(async ({ default: sharp }) => {
  const fs = await import("node:fs");
  const dir = "content/photos/test-roll";
  fs.mkdirSync(dir, { recursive: true });
  await sharp({ create: { width: 2400, height: 1600, channels: 3, background: { r: 40, g: 40, b: 60 } } })
    .jpeg().toFile(`${dir}/frame-01.jpg`);
  await sharp({ create: { width: 1800, height: 1200, channels: 3, background: { r: 80, g: 60, b: 40 } } })
    .jpeg().toFile(`${dir}/frame-02.jpg`);
  console.log("placeholder roll written to", dir);
});
'
```

再写一份最小 `content/photos/test-roll/index.md`(直接用 Write 工具,不走上面的 node 脚本):

```markdown
---
title: test roll
date: 2026-08-22
---
用于验证同步管线的占位素材,不是真实照片。
```

- [ ] **Step 3: dry-run 验证**

Run: `pnpm sync:images --dry-run`
Expected: 对 `test-roll` 下两张图各打印一行 `+ photos/test-roll/frame-XX.jpg: would process & upload`,后面跟着缩进的 manifest 条目 JSON 预览(`id`/`width`/`height`/`blurhash`/`blurDataUrl`/`exif: null`/`takenAt`);无报错、无 R2 网络请求(可用 `DevTools`/`lsof` 或直接观察——没有配置 R2 环境变量时脚本也应该顺利跑完这一步,不因缺凭据而失败,因为 `--dry-run` 优先于凭据检查)。

Run: `pnpm sync:images --dry-run` **再跑一次**(不改动任何文件)
Expected: 输出与上一次逐行相同(spec §4.7 幂等性验收口径的具体体现——因为两次都在跟同一份不存在/不变的 `content/image-manifest.json` 比较)。

- [ ] **Step 4: 无凭据时的真实(非 dry-run)模式验证**

Run: `pnpm sync:images`(确认本机 shell 没有设置任何 `R2_*` 环境变量)
Expected: 非零退出码,stderr 打印 `✗ missing R2 credentials: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL`,不写 `content/image-manifest.json`(`git status` 确认该文件未被创建)。

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-images.mjs
git commit -m "feat(sync-images): CLI entrypoint wiring iCloud/resize/blur/exif/R2 pipeline (spec §4.1/§4.6)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

（`content/photos/test-roll/` **不要** `git add`——图片二进制已被 Task 1 的 gitignore 规则挡住,但 `index.md` 不会自动被挡,所以这里显式只 `add scripts/sync-images.mjs` 一个文件。这个占位 roll 是手动走查用的临时 fixture,不是真实内容,留给 Task 12/13 复用后在 Task 15 统一清理,全程保持 untracked。）

---

## Task 10: `lib/content-schema.ts` — `photoSetSchema`

**Files:**
- Create: `lib/content-schema.ts`
- Test: `lib/content-schema.test.ts`

**Interfaces:**
- Produces: `photoSetSchema: ZodObject`(spec §3.1),`PhotoSetFrontmatter`(推导类型)。Task 11 会在 `lib/content.ts` 里 `import { photoSetSchema } from "./content-schema"` 并用 `.safeParse()` 校验。

- [ ] **Step 1: 写测试**

```ts
// lib/content-schema.test.ts
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
```

- [ ] **Step 2: 运行测试,确认失败**

Run: `npx vitest run lib/content-schema.test.ts`
Expected: FAIL — 模块不存在。

- [ ] **Step 3: 写实现**

```ts
// lib/content-schema.ts
// photoSet frontmatter 的 zod schema(spec §3.1 / DESIGN §4 约定 3)。
// 本仓库第一个 lib/content-schema.ts 文件与第一个 zod 依赖;now/about/lab 现有的
// ad hoc 手写校验本次不回头重构——DESIGN §4 说全量 schema 最终都要搬进这个文件,
// 但那是第 4 期随解析管线一起做的事,本次只加 photoSet 一个。

import { z } from "zod";

export const photoSetSchema = z.object({
  title: z.string().trim().min(1).optional(),
  date: z.coerce.date().optional(),
  photos: z
    .array(
      z.object({
        file: z
          .string()
          .trim()
          .min(1)
          .regex(/\.(jpe?g|png|webp|heic)$/i, "file 必须是图片文件名(jpg/jpeg/png/webp/heic)"),
        caption: z.string().optional(),
      }),
    )
    .optional(),
});

export type PhotoSetFrontmatter = z.infer<typeof photoSetSchema>;
```

- [ ] **Step 4: 运行测试,确认通过**

Run: `npx vitest run lib/content-schema.test.ts`
Expected: PASS,5/5。

- [ ] **Step 5: Commit**

```bash
git add lib/content-schema.ts lib/content-schema.test.ts
git commit -m "feat(content): photoSet frontmatter zod schema (spec §3.1)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 11: `lib/content.ts` — `getPhotoRolls()` / `getPhotoRoll()`

**Files:**
- Modify: `lib/content.ts`
- Test: `lib/content.test.ts`(新文件——`lib/content.ts` 此前没有测试)

**Interfaces:**
- Consumes: `photoSetSchema`(Task 10)、`sharp`(Task 1,仅 dev 回落读尺寸用)。
- Produces:
  ```ts
  export type PhotoExif = {
    camera?: string; lens?: string; iso?: number;
    aperture?: number; shutter?: string; focal?: number;
  };
  export type PhotoFrame = {
    file: string;
    sizes: Partial<Record<"480" | "960" | "1600" | "2400", string>> | null;
    width: number | null;
    height: number | null;
    blurDataUrl: string | null;
    takenAt: string | null;
    exif: PhotoExif | null;
    caption?: string;
  };
  export type PhotoRoll = {
    slug: string; title: string; date: string | null;
    paragraphs: string[]; frames: PhotoFrame[];
  };
  export function getPhotoRolls(opts?: {
    photosDir?: string; manifestPath?: string; devLinkPath?: string;
  }): Promise<PhotoRoll[]>;
  export function getPhotoRoll(slug: string, opts?: {
    photosDir?: string; manifestPath?: string; devLinkPath?: string;
  }): Promise<PhotoRoll | null>;
  ```
  两个函数都是 **async**——这是本文件里第一对异步的内容读取函数(其余 `now`/`about`/`lab` 都是同步的),原因是 dev 模式本地回落(§6.4)需要现读图片尺寸,`sharp(...).metadata()` 只有异步 API。`app/photos/page.tsx`(Task 13)因此要写成 `async function PhotosPage()`。
  `opts` 三个字段全部可选,只服务测试注入(生产调用永远 `getPhotoRolls()` 不带参数);`devLinkPath` 尤其重要——不注入时默认落在真实仓库的 `public/_dev-photos`,测试如果不覆盖这个路径,会在跑测试的过程中真的在仓库里建一个符号链接,这是必须避免的副作用。

- [ ] **Step 1: 修正文件头 stale 注释,新增 import**

`lib/content.ts` 当前文件头注释里这句话是 2026-08-22 期3/期4 对调前的残留:

```
// 通用解析管线、zod 校验、new:* 脚手架仍在第 3 期——那时只改本文件的实现,
```

改成:

```
// 通用解析管线、zod 校验、new:* 脚手架仍在第 4 期——那时只改本文件的实现,
```

在文件顶部 import 区(`import matter from "gray-matter";` 之后)追加:

```ts
import sharp from "sharp";
import { photoSetSchema } from "./content-schema";
```

- [ ] **Step 2: 写测试(先写,此时 `getPhotoRolls`/`getPhotoRoll` 还不存在,预期报错)**

```ts
// lib/content.test.ts
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
      configurable: true,
    });
  });

  function setEnv(value: string) {
    Object.defineProperty(process.env, "NODE_ENV", { value, configurable: true });
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

  it("returns [] when the photos directory doesn't exist", async () => {
    const rolls = await getPhotoRolls({
      photosDir: "/nonexistent/dir",
      manifestPath: fixture.manifestPath,
      devLinkPath: fixture.devLinkPath,
    });
    expect(rolls).toEqual([]);
  });
});
```

- [ ] **Step 3: 运行测试,确认失败**

Run: `npx vitest run lib/content.test.ts`
Expected: FAIL — `getPhotoRolls`/`getPhotoRoll` 未导出。

- [ ] **Step 4: 写实现(追加到 `lib/content.ts` 文件末尾,即 `getRoomStatuses()` 之后)**

```ts
// ——————————————————————— /photos 暗房 ———————————————————————
// 元数据校验走 photoSetSchema(§3.1);manifest 是机器写的产物(§3.2),这里只读。
// getPhotoRolls/getPhotoRoll 是本文件第一对 async 函数——dev 回落(§6.4)需要
// sharp(...).metadata() 现读本地图片尺寸,只有异步 API。

export type PhotoExif = {
  camera?: string;
  lens?: string;
  iso?: number;
  aperture?: number;
  shutter?: string;
  focal?: number;
};

export type PhotoFrame = {
  file: string;
  sizes: Partial<Record<"480" | "960" | "1600" | "2400", string>> | null;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
  takenAt: string | null;
  exif: PhotoExif | null;
  caption?: string;
};

export type PhotoRoll = {
  slug: string;
  title: string;
  date: string | null;
  paragraphs: string[];
  frames: PhotoFrame[];
};

type ManifestEntry = {
  id: string;
  roll: string;
  takenAt: string | null;
  width: number;
  height: number;
  blurhash: string | null;
  blurDataUrl: string | null;
  exif: PhotoExif | null;
  sizes: Partial<Record<"480" | "960" | "1600" | "2400", string>>;
};
type ImageManifest = Record<string, ManifestEntry>;

const PHOTOS_DIR = path.join(CONTENT_DIR, "photos");
const MANIFEST_PATH = path.join(CONTENT_DIR, "image-manifest.json");
const DEV_LINK_PATH = path.join(process.cwd(), "public", "_dev-photos");
const IMAGE_FILE_RE = /\.(jpe?g|png|webp|heic)$/i;

function readManifestFile(manifestPath: string): ImageManifest {
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    return {};
  }
}

/** 独立于 readUnit():readUnit() 固定读真实 CONTENT_DIR,这里要支持测试注入的 photosDir。 */
function readPhotoUnit(
  photosDir: string,
  slug: string,
): { data: Record<string, unknown>; body: string } | null {
  const file = path.join(photosDir, slug, "index.md");
  let raw: string;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
  const parsed = matter(raw);
  return { data: parsed.data as Record<string, unknown>, body: parsed.content.trim() };
}

/** frontmatter photos[] 顺序在前,未登记的文件按字典序追加在后(§2)。 */
function orderedFiles(
  rollDir: string,
  frontmatterPhotos: { file: string; caption?: string }[],
): { file: string; caption?: string }[] {
  let allFiles: string[];
  try {
    allFiles = fs.readdirSync(rollDir).filter((f) => IMAGE_FILE_RE.test(f));
  } catch {
    return [];
  }
  const listed = new Set(frontmatterPhotos.map((p) => p.file));
  const rest = allFiles.filter((f) => !listed.has(f)).sort();
  return [...frontmatterPhotos, ...rest.map((file) => ({ file }))];
}

const devFallbackLinksVerified = new Set<string>();

/** 惰性创建一次符号链接;只读文件系统等失败场景静默忽略,退化为下一层的"生产行为"(§6.4)。 */
function ensureDevFallbackLink(photosDir: string, devLinkPath: string): boolean {
  if (devFallbackLinksVerified.has(devLinkPath)) return true;
  try {
    if (!fs.existsSync(devLinkPath)) {
      fs.mkdirSync(path.dirname(devLinkPath), { recursive: true });
      fs.symlinkSync(photosDir, devLinkPath, "dir");
    }
    devFallbackLinksVerified.add(devLinkPath);
    return true;
  } catch {
    return false;
  }
}

async function buildFrame(
  roll: string,
  file: string,
  caption: string | undefined,
  manifest: ImageManifest,
  photosDir: string,
  devLinkPath: string,
): Promise<PhotoFrame | null> {
  const source = `photos/${roll}/${file}`;
  const entry = manifest[source];
  if (entry) {
    return {
      file,
      sizes: entry.sizes,
      width: entry.width,
      height: entry.height,
      blurDataUrl: entry.blurDataUrl,
      takenAt: entry.takenAt,
      exif: entry.exif,
      caption,
    };
  }

  // manifest 里没有这张图:生产构建直接不渲染这一帧,不报错(§6.4,与 getRoomStatuses()
  // 现有的"没数据就 null"是同一种"宁缺毋滥"处理)。
  if (process.env.NODE_ENV === "production") return null;

  // dev 模式本地回落(§6.4 / DESIGN §4.6)
  const linked = ensureDevFallbackLink(photosDir, devLinkPath);
  if (!linked) return null;

  const absPath = path.join(photosDir, roll, file);
  let width: number | null = null;
  let height: number | null = null;
  try {
    const meta = await sharp(absPath).metadata();
    width = meta.width ?? null;
    height = meta.height ?? null;
  } catch {
    // 本地文件也读不到(占位图还没真的放进去):照样给一个可用的帧,只是没有尺寸信息
  }
  const devUrl = `/_dev-photos/${roll}/${file}`;
  return {
    file,
    sizes: { "480": devUrl, "960": devUrl, "1600": devUrl, "2400": devUrl },
    width,
    height,
    blurDataUrl: null,
    takenAt: null,
    exif: null,
    caption,
  };
}

export async function getPhotoRolls(opts?: {
  photosDir?: string;
  manifestPath?: string;
  devLinkPath?: string;
}): Promise<PhotoRoll[]> {
  const photosDir = opts?.photosDir ?? PHOTOS_DIR;
  const manifestPath = opts?.manifestPath ?? MANIFEST_PATH;
  const devLinkPath = opts?.devLinkPath ?? DEV_LINK_PATH;
  const manifest = readManifestFile(manifestPath);

  let slugs: string[];
  try {
    slugs = fs
      .readdirSync(photosDir)
      .filter((name) => fs.statSync(path.join(photosDir, name)).isDirectory());
  } catch {
    return [];
  }

  const rolls: PhotoRoll[] = [];
  for (const slug of slugs) {
    const rollDir = path.join(photosDir, slug);
    const unit = readPhotoUnit(photosDir, slug);

    let title = slug;
    let date: string | null = null;
    let paragraphs: string[] = [];
    let frontmatterPhotos: { file: string; caption?: string }[] = [];

    if (unit) {
      const parsed = photoSetSchema.safeParse(unit.data);
      if (!parsed.success) {
        const issues = parsed.error.issues
          .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
          .join("\n");
        throw new Error(
          `content/photos/${slug}/index.md frontmatter 校验失败:\n${issues}`,
        );
      }
      if (parsed.data.title) title = parsed.data.title;
      if (parsed.data.date) date = parsed.data.date.toISOString();
      paragraphs = toParagraphs(unit.body);
      frontmatterPhotos = parsed.data.photos ?? [];
    }

    const files = orderedFiles(rollDir, frontmatterPhotos);
    const built = await Promise.all(
      files.map(({ file, caption }) =>
        buildFrame(slug, file, caption, manifest, photosDir, devLinkPath),
      ),
    );
    const frames = built.filter((f): f is PhotoFrame => f !== null);

    rolls.push({ slug, title, date, paragraphs, frames });
  }

  rolls.sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return a.slug.localeCompare(b.slug);
  });

  return rolls;
}

export async function getPhotoRoll(
  slug: string,
  opts?: { photosDir?: string; manifestPath?: string; devLinkPath?: string },
): Promise<PhotoRoll | null> {
  const rolls = await getPhotoRolls(opts);
  return rolls.find((r) => r.slug === slug) ?? null;
}
```

- [ ] **Step 5: 运行测试,确认通过**

Run: `npx vitest run lib/content.test.ts`
Expected: PASS,6/6。

- [ ] **Step 6: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误(尤其确认 `PhotoRoll`/`PhotoFrame` 类型定义没有跟 Task 12/13 要用到的字段名对不上——下一个任务会直接引用 `frame.sizes`/`frame.blurDataUrl`/`frame.exif`/`frame.takenAt`/`frame.caption`/`roll.title`/`roll.frames`,现在核对一遍字段名,避免命名漂移)。

- [ ] **Step 7: Commit**

```bash
git add lib/content.ts lib/content.test.ts
git commit -m "feat(content): getPhotoRolls/getPhotoRoll with dev-mode local fallback (spec §6.3/§6.4)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 12: `components/photos/photo-darkroom.tsx` — 瀑布流 + 灯箱

**Files:**
- Create: `components/photos/photo-darkroom.tsx`

**Interfaces:**
- Consumes: `PhotoRoll`/`PhotoFrame`(Task 11)。
- Produces: `export function PhotoDarkroom({ rolls }: { rolls: PhotoRoll[] })`——client component,Task 13 的 `app/photos/page.tsx` 直接渲染它。

本仓库没有为 React 组件配测试(`vitest.config.ts` 目前只跑 `.test.{ts,mts,mjs}`,不含 JSX/TSX——与其余房间页面同构,组件靠手动走查验证,不是缺口)。

- [ ] **Step 1: 写实现**

```tsx
"use client";

// /photos 暗房:瀑布流索引 + 内嵌灯箱(spec §6.1/§6.2)。
// CSS 多栏瀑布流,不引入 masonry 库;灯箱手写,不引入轮播库——两处都延续
// DESIGN §5 已经定的调子("<img srcset> 优于自定义 loader",少一层抽象)。

import { useCallback, useEffect, useState } from "react";
import type { PhotoFrame, PhotoRoll } from "@/lib/content";

type LightboxState = { rollIndex: number; frameIndex: number } | null;

/** EXIF 行:`X100V · 23mm · f/2 · 1/250 · ISO 640 · 2026-06-30`(DESIGN §5)。
 * 字段缺失时优雅省略,不留悬空的 " · "(spec §6.2)。 */
function formatExifLine(frame: PhotoFrame): string | null {
  const parts: string[] = [];
  if (frame.exif?.camera) parts.push(frame.exif.camera);
  if (frame.exif?.focal) parts.push(`${frame.exif.focal}mm`);
  if (frame.exif?.aperture) parts.push(`f/${frame.exif.aperture}`);
  if (frame.exif?.shutter) parts.push(frame.exif.shutter);
  if (frame.exif?.iso) parts.push(`ISO ${frame.exif.iso}`);
  if (frame.takenAt) parts.push(frame.takenAt.slice(0, 10));
  return parts.length ? parts.join(" · ") : null;
}

function srcSetFor(frame: PhotoFrame): string | undefined {
  if (!frame.sizes) return undefined;
  return Object.entries(frame.sizes)
    .map(([w, url]) => `${url} ${w}w`)
    .join(", ");
}

function largestSrc(frame: PhotoFrame): string {
  if (!frame.sizes) return "";
  const widths = Object.keys(frame.sizes)
    .map(Number)
    .sort((a, b) => b - a);
  const key = String(widths[0]) as keyof NonNullable<PhotoFrame["sizes"]>;
  return frame.sizes[key] ?? "";
}

export function PhotoDarkroom({ rolls }: { rolls: PhotoRoll[] }) {
  const [lightbox, setLightbox] = useState<LightboxState>(null);

  const close = useCallback(() => setLightbox(null), []);

  const step = useCallback(
    (delta: number) => {
      setLightbox((current) => {
        if (!current) return current;
        const roll = rolls[current.rollIndex];
        const next = current.frameIndex + delta;
        if (next < 0 || next >= roll.frames.length) return current;
        return { ...current, frameIndex: next };
      });
    },
    [rolls],
  );

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, close, step]);

  const activeFrame = lightbox ? rolls[lightbox.rollIndex].frames[lightbox.frameIndex] : null;
  const exifLine = activeFrame ? formatExifLine(activeFrame) : null;

  return (
    <div className="space-y-16">
      {rolls.map((roll, rollIndex) => (
        <section key={roll.slug}>
          <h2 className="font-mono text-xs text-white/40">{roll.title}</h2>
          <div className="mt-4 columns-2 gap-2 md:columns-3">
            {roll.frames.map((frame, frameIndex) => (
              <button
                key={frame.file}
                type="button"
                onClick={() => setLightbox({ rollIndex, frameIndex })}
                className="mb-2 block w-full break-inside-avoid focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-500"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- 静态导出走 srcset,
                    不用 next/image custom loader(DESIGN §5 已否决该方案) */}
                <img
                  src={largestSrc(frame)}
                  srcSet={srcSetFor(frame)}
                  sizes="(min-width: 768px) 33vw, 50vw"
                  alt={frame.caption ?? ""}
                  loading="lazy"
                  style={
                    frame.blurDataUrl
                      ? { backgroundImage: `url(${frame.blurDataUrl})`, backgroundSize: "cover" }
                      : undefined
                  }
                  className="w-full"
                />
              </button>
            ))}
          </div>
        </section>
      ))}

      {lightbox && activeFrame && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-6"
        >
          <button
            type="button"
            onClick={close}
            aria-label="close"
            className="absolute right-6 top-6 font-mono text-xs text-white/60 transition-colors duration-200 hover:text-white"
          >
            Esc ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={largestSrc(activeFrame)}
            srcSet={srcSetFor(activeFrame)}
            alt={activeFrame.caption ?? ""}
            className="max-h-[80vh] max-w-full object-contain"
          />
          {exifLine && <p className="mt-4 font-mono text-xs text-white/40">{exifLine}</p>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误。

- [ ] **Step 3: Commit**

```bash
git add components/photos/photo-darkroom.tsx
git commit -m "feat(photos): masonry grid + hand-rolled lightbox (spec §6.1/§6.2)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 13: `app/photos/page.tsx` — 房间接线

**Files:**
- Modify (或 Create,取决于当前仓库状态): `app/photos/page.tsx`

**Interfaces:**
- Consumes: `getPhotoRolls()`(Task 11)、`PhotoDarkroom`(Task 12)、`RoomShell`(既有,`components/room-shell.tsx`)。

本页无需新增 `lib/i18n/strings.ts` 条目——所有可见文案(roll 标题、caption、EXIF 行)都来自内容/数据,不是硬编码 chrome 文案,不像 `/now`/`/about`/`/lab` 那样需要 `t()` 翻译键。`RoomShell` 默认 `max-w-2xl` 是给正文栏用的,瀑布流需要更宽,通过 `className` 覆盖(`cn()` 用 `tailwind-merge`,后传入的 `max-w-*` 会覆盖默认值,不产生冲突类名)。

- [ ] **Step 1: 写实现**

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoomShell } from "@/components/room-shell";
import { PhotoDarkroom } from "@/components/photos/photo-darkroom";
import { getPhotoRolls } from "@/lib/content";
import type { Locale } from "@/lib/i18n/strings";
import { isWillsleep } from "@/lib/site";

// /photos — 暗房(§DESIGN 5)。瀑布流索引 + 内嵌灯箱,图源全部走 R2(§DESIGN 6)。
// 房间名不外泄到 yueqiao 构建(红线 2 的身份切分):那边这条路由只是一个 404

export const metadata: Metadata = isWillsleep
  ? { title: "photos · The Sleep Lab", description: "暗房:按 roll 分组的照片" }
  : { title: "Not found · Yueqiao Dev" };

export default async function PhotosPage({
  locale = "canonical",
}: {
  locale?: Locale;
}) {
  // 双站门控(§DESIGN 8):yueqiao 构建不出新板块
  if (!isWillsleep) notFound();

  const rolls = await getPhotoRolls();
  if (rolls.length === 0) notFound();

  return (
    <RoomShell room="photos" locale={locale} className="max-w-5xl">
      <PhotoDarkroom rolls={rolls} />
    </RoomShell>
  );
}
```

- [ ] **Step 2: 类型检查 + 构建**

Run: `npx tsc --noEmit`
Expected: 无错误。
Run: `pnpm build:willsleep`
Expected: 构建成功;因为 `content/image-manifest.json` 尚不存在且 `content/photos/test-roll/` 没有任何 manifest 条目,生产模式下 `getPhotoRolls()` 返回的每个 roll 的 `frames` 都是空数组——**这本身是符合预期的中间状态**,不是 bug(§6.4:生产模式缺失的帧直接剔除;`test-roll` 全部帧都缺失,剔到空)。

- [ ] **Step 3: dev 模式手动走查(占位图效果验证,复用 Task 9 生成的 `test-roll`)**

Run: `pnpm dev` → 打开 `http://localhost:3000/photos/`
Expected:
1. 页面标题下方出现一个分组 `test roll`,两张占位图(深蓝灰 / 深棕灰纯色块)以两栏(桌面三栏)瀑布流排列。
2. 点击任意一张 → 全屏灯箱,右上角 `Esc ✕` 可点击关闭;键盘 `Esc` 同样关闭。
3. 灯箱内 `←`/`→` 在两张占位图之间切换(到边界时停住,不报错、不越界)。
4. 底部 mono 行只显示日期(`2026-08-22`,来自 `test-roll/index.md` 的 `date` 回落到 §4.5 第二层——因为占位图没有真实 EXIF,`exif` 为 `null`,该行只剩日期这一个片段,不出现悬空的" · ")。
5. `http://localhost:3000/photos/` 直接访问(不经走廊)也能进入——`lib/rooms.ts` 的 `photos.open` 虽然还是 `false`(走廊门牌不显示),但路由本身是真实存在的,这是与其它房间一致的现状(`open` 只控制走廊门牌渲染,不控制路由是否存在)。

- [ ] **Step 4: `yueqiao` 构建门控验证**

Run: `pnpm build:yueqiao`
Expected: 构建成功;`out/photos/` 目录不存在或其 `index.html` 是 404 页面内容(与 `/now`、`/about` 现状一致)。

- [ ] **Step 5: 清理占位测试素材**

Run: `rm -rf content/photos/test-roll`

Expected: `git status` 干净(该目录全程 untracked,`rm -rf` 后不留痕迹)。

- [ ] **Step 6: Commit**

```bash
git add app/photos/page.tsx
git commit -m "feat(photos): wire index page — dual-site gate, RoomShell, PhotoDarkroom (spec §6)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 14: 文档同步 — DESIGN.md / BUILD-LOG.md / stale 标签

**Files:**
- Modify: `docs/DESIGN.md`
- Modify: `docs/BUILD-LOG.md`

spec §11 列出的收尾同步项(`lib/content.ts` 的 stale 注释已在 Task 11 Step 1 顺手修过,这里不重复)。

- [ ] **Step 1: `DESIGN.md` §4 脚手架小节标题**

把:

```
### 脚手架与校验(第 3 期随解析管线一起交付)
```

改成:

```
### 脚手架与校验(第 4 期随解析管线一起交付)
```

(2026-08-22 期3/期4 对调时 §9 表格已经改过,这一处小节标题当时漏改,顺手修正——见 spec §11。)

- [ ] **Step 2: `DESIGN.md` §9 期3 完成标准部分打勾**

把 §9 表格里期3那一行的"完成标准"列:

```
第一卷照片上线;GitHub Pages 产物不含图片;脚本幂等可重跑
```

改成(用删除线/勾选标注哪几条已经达成,哪条还没有——不是简单删掉原文字):

```
~~第一卷照片上线~~(管线已交付,内容上线待用户配置 R2 + 传真实素材,见 BUILD-LOG);✅ GitHub Pages 产物不含图片;✅ 脚本幂等可重跑
```

- [ ] **Step 3: `BUILD-LOG.md` 期3 状态行**

把现状总览表格里这一行:

```
| 3 | /photos 暗房 | ⬜ | ⬜ | ⬜ | ⬜ | 下一个该开工的 |
```

改成:

```
| 3 | /photos 暗房 | ✅ | ✅ | ✅ | ⬜ | 管线与页面已实现并本机验证;R2 未配置、无真实素材,内容上线待用户完成 R2 配置后自行运行 `pnpm sync:images` |
```

(`merge` 格是否打勾取决于 Task 15 之后走 `superpowers:finishing-a-development-branch` 的实际合并结果,这里先留空。)

- [ ] **Step 4: Commit**

```bash
git add docs/DESIGN.md docs/BUILD-LOG.md
git commit -m "docs: sync DESIGN.md/BUILD-LOG.md for /photos darkroom pipeline delivery

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 15: 全量验证

**Files:** 无新改动;仅验证。

- [ ] **Step 1: 类型检查 + lint + 单元测试**

Run: `npx tsc --noEmit`
Expected: 无错误。
Run: `pnpm lint`
Expected: 无错误(尤其检查 Task 12 里两处 `eslint-disable-next-line @next/next/no-img-element` 注释生效,没有被当作未使用的 disable 指令报警——如果 eslint 配置对未用到的 disable 注释报错,视实际输出决定是否需要保留该注释)。
Run: `pnpm test`
Expected: 全部通过(Task 2/3/4/5/6/7/8/10/11 累计的测试用例,约 40+ 个)。

- [ ] **Step 2: 双域名构建**

**先清理 dev 回落符号链接,再构建**——`public/_dev-photos`(§6.4)只应在 `NODE_ENV=development` 时被惰性创建,`next build` 跑在 production 模式下不会新建它,但如果 Task 13 Step 3 的 `pnpm dev` 手动走查留下了这个符号链接没清理,一次 `next build` 会把 `public/` 下的所有内容(含这个指向 `content/photos/` 的符号链接)照单全收进产物,产物就会意外包含图片二进制。构建前先确认它不存在:

Run: `rm -f public/_dev-photos`
Run: `pnpm build:willsleep`
Expected: 构建成功。
Run: `find out -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.webp"`
Expected: 零输出(GitHub Pages 产物不含任何图片二进制,DESIGN §9 期3 完成标准之一——用 `find` 查文件本身是否存在,不是查文本内容,`grep -r` 对二进制文件默认不生效,不是正确的检查方式)。
Run: `pnpm build:yueqiao`
Expected: 构建成功;`/photos` 路由不可达。

- [ ] **Step 3: 幂等性最终确认**

Run(需要 `content/photos/` 下至少有 Task 9 那种占位素材,如果 Task 13 Step 5 已清理,重新按 Task 9 Step 2 生成一次):
```bash
pnpm sync:images --dry-run > /tmp/dry-run-1.txt
pnpm sync:images --dry-run > /tmp/dry-run-2.txt
diff /tmp/dry-run-1.txt /tmp/dry-run-2.txt
```
Expected: `diff` 零输出(两次 dry-run 逐行相同,DESIGN §9 期3"脚本幂等可重跑"完成标准的直接证据)。跑完后 `rm -rf content/photos/test-roll` 再次清理,保持 untracked 目录不残留。

- [ ] **Step 4: `git status` 收尾检查**

Run: `git status`
Expected: 干净(无残留的 `content/photos/test-roll`、无 `public/_dev-photos` 符号链接——这两者都只应存在于测试 fixture 的临时目录里,不应该出现在真实仓库工作区)。若 `public/_dev-photos` 意外出现在仓库根目录(比如手动跑 `pnpm dev` 时因为访问过 `/photos` 页面而被创建),删除它:`rm -f public/_dev-photos`(已被 Task 1 的 gitignore 规则覆盖,不影响 git 状态,但保持工作区干净仍然值得做)。

---

## 收尾说明

本计划完成后,`/photos` 的**管线**(同步脚本、frontmatter 校验、manifest 读取、页面渲染)已经具备完整实现并通过本机验证,但**内容尚未上线**——`lib/rooms.ts` 里 `photos.open` 仍是 `false`,`content/image-manifest.json` 不存在。这两件事都要等用户完成 spec §5 的 R2 配置步骤、放入真实照片、跑一次不带 `--dry-run` 的 `pnpm sync:images` 之后才会改变,不属于本计划范围(spec §0/§1/§10 已经明确这条边界)。

按开工 prompt 的既定顺序,本计划执行完后依次调用:`superpowers:requesting-code-review`(自查一遍,有意见就用 `superpowers:receiving-code-review` 甄别处理)→ `superpowers:verification-before-completion`(真的跑一遍 Task 15 的全部命令并确认通过)→ `superpowers:finishing-a-development-branch`(决定怎么合并回 main,不要自己 push)。
