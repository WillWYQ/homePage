# /notes 档案室 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 `/notes` 档案室的完整内容管线(note/dream/incident 三类 zod 校验、markdown 编译 + 插图落地、`scripts/new-content.mjs` 四子命令脚手架)与页面(列表 + 文章页 + RSS),并用脚手架发布第一篇 note、REM-001、IR-001,把 `lib/rooms.ts` 的 `notes.open` 翻真。

**Architecture:** 延续 `now`/`about`/`lab` 的内容单元读取模式(`lib/content.ts` 现有的 `readUnit()`),但正文改走真正的 markdown 编译(`unified`/`remark-*`,独立成 `lib/notes-markdown.ts` 一个纯函数模块),因为 notes 是长文章不是短陈述句。frontmatter 校验是三个 zod 子 schema 的 discriminated union(`lib/content-schema.ts`),校验失败直接抛错——复用 `photoSetSchema`/`reelSchema` 已经验证过的"构建期报错、指明文件"模式。脚手架脚本参照 `scripts/sync-images.mjs` 的拆分方式:纯逻辑(编号分配、slug 生成、frontmatter 模板)各自独立成小模块可单测,CLI 编排(`readline` 交互问答)留在入口文件,用管道输入做端到端验证而不是 mock stdin 的单元测试。

**Tech Stack:** Next.js 16 静态导出、TypeScript strict、zod 4、gray-matter(已有依赖,新增 `unified`/`remark-parse`/`remark-gfm`/`remark-rehype`/`rehype-stringify`)、Vitest。

**Spec:** [docs/superpowers/specs/2026-08-25-notes-archive-design.md](../specs/2026-08-25-notes-archive-design.md) — 本计划从这份 spec 推导,执行者应两份都读。首发内容(spec §11)已确认:note 主题"造这套档案室系统本身的感想";REM-001 用占位文字;IR-001 用真实的 2026-07-02 iCloud Drive 构建挂死事故。

## Global Constraints

- **档案纪律(全站红线,DESIGN §1):** 只追加不重写;REM/IR 编号永不复用;更正走文末 mono `addendum:`,不改原文。脚手架生成后若使用者反悔删掉未提交的草稿,不算"复用编号"(spec §3 边界情况)——但一旦提交,不允许再删除或重写。
- **不许假(全仓库红线):** REM-001 占位文字必须显式标注"待补"而不是伪装成真实梦境;IR-001 必须是真实发生过的事故,细节不确定处标注"记忆不完整",不编造。
- **单一强调色 + 三档灰阶(§DESIGN 2):** 编号/日期/SEV 是读数(`white/40`),标题是内容(`white/70`,链接态),不引入新的视觉层级。
- **内容库唯一入口:** 文案只住 `content/notes/**/index.md` 或 `lib/i18n/strings.ts`,页面/组件代码不硬编码任何正文文案。
- **双站门控:** 每个新路由(`/notes`、`/notes/[slug]`、`/feed.xml`)都要在 `yueqiao` 构建下不泄露 willsleep 专属内容,做法与 `/now`/`/about`/`/lab` 的 `isWillsleep` 分支 + 双写 `metadata` 一致。
- **签名效果:无。** DESIGN §10.1 账本已登记 /notes 为"无",本计划不新增任何入场动画或 hover 增强。
- **zh/en 翻译不在本计划范围**(第 5 期)——`lang` 字段写入但不消费,不实现 `index.zh.md`/`index.en.md` 读取。
- **验收 = `npx tsc --noEmit` + `pnpm lint` + `pnpm test` + `pnpm build:willsleep` + `pnpm build:yueqiao`**(Task 14 统一跑一遍,外加一次故意写坏字段的构建失败演示)。
- **提交:** 每个任务收尾单独 commit。

---

## 文件结构(本计划结束时)

**新建:**
- `lib/notes-markdown.ts` — `compileMarkdown()`(unified/remark 管线 + 相对图片路径改写)、`copyNoteAssets()`(插图拷贝到 `public/notes/<slug>/`)
- `lib/notes-markdown.test.ts`
- `scripts/new-content/numbering.mjs` — `nextNumber(notesDir, field)`,扫描现有 frontmatter 取 `max + 1`
- `scripts/new-content/numbering.test.mjs`
- `scripts/new-content/slug.mjs` — `slugify(title)` / `dateSlug(date, title)`
- `scripts/new-content/slug.test.mjs`
- `scripts/new-content/templates.mjs` — 四种类型的 `{ data, body }` frontmatter 模板构造
- `scripts/new-content/templates.test.mjs`
- `scripts/new-content.mjs` — CLI 编排入口(交互问答)
- `app/notes/page.tsx` — 列表页
- `app/notes/[slug]/page.tsx` — 文章页
- `app/feed.xml/route.ts` — RSS

**修改:**
- `package.json` — 新增 5 个 dependencies(`unified`/`remark-parse`/`remark-gfm`/`remark-rehype`/`rehype-stringify`)+ 4 个 scripts(`new:note`/`new:dream`/`new:incident`/`new:roll`)
- `.gitignore` — `/public/notes/` 构建期生成目录忽略
- `lib/content-schema.ts` — 新增 `noteSchema`/`dreamSchema`/`incidentSchema`/`noteRecordSchema`
- `lib/content-schema.test.ts`
- `lib/content.ts` — 新增 `NoteRecord` 类型族、`getNotes()`/`getNote()`/`formatRecordId()`;`RoomStatuses.notes` 从 `null` 接上真实值
- `lib/content.test.ts`
- `lib/i18n/strings.ts` — 新增 `notes.record.*` 四个字段标签
- `lib/rooms.ts` — 首发内容发布后(Task 12)`notes.open` 翻 `true`;顺手修正 stale 注释"第 3 期"→"第 4 期"
- `content/notes/` — 新建三个内容单元(首发 note、REM-001、IR-001,Task 12)
- `docs/DESIGN.md` — §9 期 4 完成标准打勾
- `docs/BUILD-LOG.md` — 期 4 状态行更新;顺手订正期 2/3/`—`(reel)三行已经过期的 merge 列(见 spec §13)

**不碰:** `lib/rooms.ts` 的 `RoomId` 联合类型(已经包含 `"notes"`)、`components/specimen-shelf.tsx`(已有 `case "notes"`,confirmed via grep)、`components/room-shell.tsx`/`components/room-header.tsx`(直接复用)。

---

## Task 1: `noteRecordSchema` — content contract in `lib/content-schema.ts`

**Files:**
- Modify: `lib/content-schema.ts`
- Test: `lib/content-schema.test.ts`

**Interfaces:**
- Produces: `noteSchema`、`dreamSchema`、`incidentSchema`、`noteRecordSchema = z.discriminatedUnion("type", [noteSchema, dreamSchema, incidentSchema])`、`type NoteRecordFrontmatter = z.infer<typeof noteRecordSchema>`。Task 3 (`lib/content.ts`) 从本文件 `import { noteRecordSchema }`。

- [ ] **Step 1: Write the failing tests**

Append to `lib/content-schema.test.ts`:

```typescript
describe("noteRecordSchema", () => {
  it("accepts a minimal valid note", () => {
    const result = noteRecordSchema.safeParse({
      type: "note",
      title: "电梯只到 B2",
      date: "2026-07-02",
      summary: "一次关于楼层的观察",
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === "note") {
      expect(result.data.lang).toBe("mixed"); // default applied
    }
  });

  it("accepts a valid dream with optional fields", () => {
    const result = noteRecordSchema.safeParse({
      type: "dream",
      title: "dream",
      date: "2026-07-02",
      summary: "碎片",
      rem: 7,
      recorded: "2026-07-02T06:41",
      lucidity: 2,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a dream with only the required rem field", () => {
    const result = noteRecordSchema.safeParse({
      type: "dream",
      title: "dream",
      date: "2026-07-02",
      summary: "碎片",
      rem: 1,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a dream missing rem", () => {
    const result = noteRecordSchema.safeParse({
      type: "dream",
      title: "dream",
      date: "2026-07-02",
      summary: "碎片",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["rem"]);
    }
  });

  it("rejects a dream with rem as a non-integer string", () => {
    const result = noteRecordSchema.safeParse({
      type: "dream",
      title: "dream",
      date: "2026-07-02",
      summary: "碎片",
      rem: "seven",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid incident and defaults status to ongoing", () => {
    const result = noteRecordSchema.safeParse({
      type: "incident",
      title: "node_modules 被 iCloud 蒸发事故",
      date: "2026-07-02",
      summary: "构建挂死事故",
      ir: 1,
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === "incident") {
      expect(result.data.status).toBe("ongoing");
    }
  });

  it("rejects an incident missing ir", () => {
    const result = noteRecordSchema.safeParse({
      type: "incident",
      title: "x",
      date: "2026-07-02",
      summary: "x",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["ir"]);
    }
  });

  it("rejects an incident severity outside 1-3", () => {
    const result = noteRecordSchema.safeParse({
      type: "incident",
      title: "x",
      date: "2026-07-02",
      summary: "x",
      ir: 1,
      severity: 5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown status", () => {
    const result = noteRecordSchema.safeParse({
      type: "incident",
      title: "x",
      date: "2026-07-02",
      summary: "x",
      ir: 1,
      status: "fixed-ish",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a record missing summary", () => {
    const result = noteRecordSchema.safeParse({
      type: "note",
      title: "x",
      date: "2026-07-02",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unrecognized type", () => {
    const result = noteRecordSchema.safeParse({
      type: "poem",
      title: "x",
      date: "2026-07-02",
      summary: "x",
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/content-schema.test.ts`
Expected: FAIL — `noteRecordSchema` is not exported from `./content-schema`.

- [ ] **Step 3: Implement the schemas**

Append to `lib/content-schema.ts` (after the existing `reelSchema` block):

```typescript
// note/dream/incident frontmatter 的 zod schema(spec §2)。三种类型共享基础字段,
// 靠 type 字段做 discriminated union。校验失败处理与 photoSetSchema/reelSchema
// 同构:安全解析失败在 getNotes()/getNote() 里直接抛错,不在这里处理。

const noteBaseSchema = z.object({
  title: z.string().trim().min(1),
  date: z.coerce.date(),
  summary: z.string().trim().min(1),
  lang: z.enum(["mixed", "zh", "en"]).default("mixed"),
});

export const noteSchema = noteBaseSchema.extend({
  type: z.literal("note"),
});

export const dreamSchema = noteBaseSchema.extend({
  type: z.literal("dream"),
  rem: z.number().int().positive(),
  recorded: z.coerce.date().optional(),
  lucidity: z.number().int().min(1).max(5).optional(),
});

export const incidentSchema = noteBaseSchema.extend({
  type: z.literal("incident"),
  ir: z.number().int().positive(),
  severity: z.number().int().min(1).max(3).optional(),
  status: z.enum(["resolved", "ongoing", "wontfix"]).default("ongoing"),
});

export const noteRecordSchema = z.discriminatedUnion("type", [
  noteSchema,
  dreamSchema,
  incidentSchema,
]);

export type NoteRecordFrontmatter = z.infer<typeof noteRecordSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/content-schema.test.ts`
Expected: PASS (all new cases green, existing `photoSetSchema`/`reelSchema` cases unaffected).

- [ ] **Step 5: Commit**

```bash
git add lib/content-schema.ts lib/content-schema.test.ts
git commit -m "feat(notes): add note/dream/incident content contract"
```

---

## Task 2: `lib/notes-markdown.ts` — markdown compile + inline image copy

**Files:**
- Create: `lib/notes-markdown.ts`
- Create: `lib/notes-markdown.test.ts`
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `compileMarkdown(body: string, slug: string): string`(纯函数,markdown → HTML 字符串,相对图片引用改写为 `/notes/<slug>/<file>`);`copyNoteAssets(notesDir: string, slug: string, publicDir: string): void`(fs 副作用,幂等地把 `notesDir/slug` 下的图片文件拷到 `publicDir/slug`)。Task 3 (`lib/content.ts`) 消费这两个函数。

- [ ] **Step 1: Add the new dependencies**

Edit `package.json`, add to `dependencies` (alphabetical, matching existing ordering):

```json
    "rehype-stringify": "^10.0.1",
    "remark-gfm": "^4.0.1",
    "remark-parse": "^11.0.0",
    "remark-rehype": "^11.1.2",
```

and:

```json
    "unified": "^11.0.5",
```

Run: `pnpm install`
Expected: lockfile updates, no errors.

- [ ] **Step 2: Write the failing tests**

Create `lib/notes-markdown.test.ts`:

```typescript
import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { compileMarkdown, copyNoteAssets } from "./notes-markdown";

describe("compileMarkdown", () => {
  it("compiles a heading and a paragraph", () => {
    const html = compileMarkdown("# Title\n\nBody text.", "some-slug");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<p>Body text.</p>");
  });

  it("compiles emphasis and links", () => {
    const html = compileMarkdown("A **bold** word and a [link](https://example.com).", "s");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain('<a href="https://example.com">link</a>');
  });

  it("rewrites a relative image src to /notes/<slug>/<file>", () => {
    const html = compileMarkdown("![a figure](./figure-1.jpg)", "2026-08-25-example");
    expect(html).toContain('src="/notes/2026-08-25-example/figure-1.jpg"');
    expect(html).not.toContain("./figure-1.jpg");
  });

  it("leaves an absolute image src untouched", () => {
    const html = compileMarkdown("![x](https://cdn.example.com/x.jpg)", "s");
    expect(html).toContain('src="https://cdn.example.com/x.jpg"');
  });

  it("compiles a GFM table", () => {
    const html = compileMarkdown("| a | b |\n|---|---|\n| 1 | 2 |", "s");
    expect(html).toContain("<table>");
  });
});

describe("copyNoteAssets", () => {
  let root: string;

  afterEach(() => {
    if (root) fs.rmSync(root, { recursive: true, force: true });
  });

  it("copies image files from notesDir/slug into publicDir/slug", () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "notes-assets-"));
    const notesDir = path.join(root, "content-notes");
    const publicDir = path.join(root, "public-notes");
    const unitDir = path.join(notesDir, "2026-08-25-example");
    fs.mkdirSync(unitDir, { recursive: true });
    fs.writeFileSync(path.join(unitDir, "index.md"), "---\n---\n");
    fs.writeFileSync(path.join(unitDir, "figure-1.jpg"), "fake-bytes");

    copyNoteAssets(notesDir, "2026-08-25-example", publicDir);

    const copied = path.join(publicDir, "2026-08-25-example", "figure-1.jpg");
    expect(fs.existsSync(copied)).toBe(true);
    expect(fs.readFileSync(copied, "utf8")).toBe("fake-bytes");
  });

  it("does not copy index.md itself", () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "notes-assets-"));
    const notesDir = path.join(root, "content-notes");
    const publicDir = path.join(root, "public-notes");
    const unitDir = path.join(notesDir, "no-images");
    fs.mkdirSync(unitDir, { recursive: true });
    fs.writeFileSync(path.join(unitDir, "index.md"), "---\n---\n");

    copyNoteAssets(notesDir, "no-images", publicDir);

    expect(fs.existsSync(path.join(publicDir, "no-images", "index.md"))).toBe(false);
  });

  it("is a no-op (does not throw) when the slug directory has no images", () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "notes-assets-"));
    const notesDir = path.join(root, "content-notes");
    const publicDir = path.join(root, "public-notes");
    fs.mkdirSync(path.join(notesDir, "empty-slug"), { recursive: true });

    expect(() => copyNoteAssets(notesDir, "empty-slug", publicDir)).not.toThrow();
    expect(fs.existsSync(path.join(publicDir, "empty-slug"))).toBe(false);
  });

  it("is a no-op when the slug directory does not exist at all", () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "notes-assets-"));
    expect(() =>
      copyNoteAssets(path.join(root, "content-notes"), "missing-slug", path.join(root, "public-notes")),
    ).not.toThrow();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run lib/notes-markdown.test.ts`
Expected: FAIL — `lib/notes-markdown.ts` does not exist.

- [ ] **Step 4: Implement**

Create `lib/notes-markdown.ts`:

```typescript
// notes 正文的 markdown 编译 + 插图落地(spec §4)。
//
// 为什么不复用 lib/content.ts 现有的 toParagraphs():那是给 now/about/lab 的短
// 陈述句/结构化字段用的简单分段法,notes 是真正的长文章(DESIGN §2/§5 的 Lora
// 正文),需要标题、加粗、链接、列表这些真实 markdown 语法。
//
// 单作者可信内容:不做 HTML sanitize(与 photos/reel 现有 zod 校验一样,这里
// 的信任边界是"作者本人",不是"任意用户输入")。

import fs from "node:fs";
import path from "node:path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

type MdastNode = { type: string; url?: string; children?: MdastNode[] };

function walkImages(node: MdastNode, fn: (node: MdastNode) => void): void {
  if (node.type === "image") fn(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) walkImages(child, fn);
  }
}

/** 把正文里 `./figure-1.jpg` 这类相对引用改写成构建产物路径(spec §4)。
 * 只处理 `./` 前缀——绝对 URL(http/https)与站内根路径不受影响。 */
function remarkRewriteRelativeImages(slug: string) {
  return (tree: MdastNode) => {
    walkImages(tree, (node) => {
      if (typeof node.url === "string" && node.url.startsWith("./")) {
        node.url = `/notes/${slug}/${node.url.slice(2)}`;
      }
    });
  };
}

export function compileMarkdown(body: string, slug: string): string {
  const file = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRewriteRelativeImages, slug)
    .use(remarkRehype)
    .use(rehypeStringify)
    .processSync(body);
  return String(file);
}

const NOTE_IMAGE_RE = /\.(jpe?g|png|webp|gif|svg)$/i;

/** 把 notesDir/slug 下的插图原样拷到 publicDir/slug(spec §4)。不经过 sharp、
 * 不查 EXIF、不生成多档尺寸——随笔插图不是照片瀑布流,这条管线故意做得很薄。
 * 幂等:每次构建都重新拷贝,拷贝相同内容在效果上就是空操作,不需要额外的
 * 哈希比对逻辑。 */
export function copyNoteAssets(notesDir: string, slug: string, publicDir: string): void {
  const srcDir = path.join(notesDir, slug);
  let files: string[];
  try {
    files = fs.readdirSync(srcDir).filter((f) => NOTE_IMAGE_RE.test(f));
  } catch {
    return;
  }
  if (files.length === 0) return;
  const destDir = path.join(publicDir, slug);
  fs.mkdirSync(destDir, { recursive: true });
  for (const file of files) {
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run lib/notes-markdown.test.ts`
Expected: PASS.

- [ ] **Step 6: Ignore the generated public assets directory**

Append to `.gitignore` (after the existing `/public/_dev-photos` line):

```
# notes 插图构建期从 content/notes/**/* 拷贝到这里(notes archive spec §4),
# 生成产物不入库
/public/notes/
```

- [ ] **Step 7: Commit**

```bash
git add lib/notes-markdown.ts lib/notes-markdown.test.ts package.json pnpm-lock.yaml .gitignore
git commit -m "feat(notes): add markdown compile pipeline + inline image copy"
```

---

## Task 3: `getNotes()` / `getNote()` / `formatRecordId()` in `lib/content.ts`

**Files:**
- Modify: `lib/content.ts`
- Test: `lib/content.test.ts`

**Interfaces:**
- Consumes: `noteRecordSchema` from `./content-schema` (Task 1); `compileMarkdown`/`copyNoteAssets` from `./notes-markdown` (Task 2); existing `readUnit()` in this file (no signature change — called as `readUnit("notes", slug)`).
- Produces: `type NoteRecord = NoteNote | NoteDream | NoteIncident`(判别字段 `type`),`getNotes(): NoteRecord[]`(按 `date` 降序),`getNote(slug: string): NoteRecord | null`,`formatRecordId(record: NoteRecord): string`(`REM-007`/`IR-002`/纯日期三种格式)。更新 `RoomStatuses.notes` 的实际取值。Task 8/9/10(页面、RSS)、Task 11(i18n 不直接依赖但同期改)都依赖这些精确名称。

- [ ] **Step 1: Write the failing tests**

Change the top-of-file import line from `import { photoSetSchema, reelSchema } from "./content-schema";` to add `noteRecordSchema`:

```typescript
import { photoSetSchema, reelSchema, noteRecordSchema } from "./content-schema";
import { compileMarkdown, copyNoteAssets } from "./notes-markdown";
```

Append to `lib/content.test.ts`:

```typescript
const NOTES_DIR = path.join(process.cwd(), "content", "notes");

function writeNoteUnit(slug: string, frontmatter: string, body = "正文段落。") {
  const dir = path.join(NOTES_DIR, slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.md"), `---\n${frontmatter}\n---\n${body}\n`);
}

describe("getNotes / getNote", () => {
  afterEach(() => {
    fs.rmSync(NOTES_DIR, { recursive: true, force: true });
  });

  it("returns an empty array when content/notes does not exist", () => {
    expect(getNotes()).toEqual([]);
  });

  it("reads a note record and compiles its body", () => {
    writeNoteUnit(
      "2026-07-01-example",
      ['type: note', 'title: "为什么便利店的灯比家里诚实"', "date: 2026-07-01", 'summary: "一句话摘要"'].join(
        "\n",
      ),
      "# 标题\n\n正文。",
    );
    const notes = getNotes();
    expect(notes).toHaveLength(1);
    expect(notes[0].type).toBe("note");
    expect(notes[0].title).toBe("为什么便利店的灯比家里诚实");
    expect(notes[0].html).toContain("<h1>标题</h1>");
  });

  it("reads a dream record with rem/recorded/lucidity", () => {
    writeNoteUnit(
      "2026-07-02-dream",
      [
        "type: dream",
        "title: dream",
        "date: 2026-07-02",
        'summary: "碎片"',
        "rem: 7",
        "recorded: 2026-07-02T06:41",
        "lucidity: 2",
      ].join("\n"),
    );
    const record = getNote("2026-07-02-dream");
    expect(record).not.toBeNull();
    expect(record!.type).toBe("dream");
    if (record!.type === "dream") {
      expect(record!.rem).toBe(7);
      expect(record!.lucidity).toBe(2);
      expect(record!.recorded).not.toBeNull();
    }
  });

  it("reads an incident record and defaults status to ongoing", () => {
    writeNoteUnit(
      "2026-07-02-incident",
      ["type: incident", "title: x", "date: 2026-07-02", 'summary: "x"', "ir: 1"].join("\n"),
    );
    const record = getNote("2026-07-02-incident");
    expect(record).not.toBeNull();
    if (record!.type === "incident") {
      expect(record!.ir).toBe(1);
      expect(record!.status).toBe("ongoing");
      expect(record!.severity).toBeNull();
    }
  });

  it("sorts records by date descending", () => {
    writeNoteUnit("2026-07-01-a", ['type: note', "title: a", "date: 2026-07-01", 'summary: "a"'].join("\n"));
    writeNoteUnit("2026-07-05-b", ['type: note', "title: b", "date: 2026-07-05", 'summary: "b"'].join("\n"));
    const notes = getNotes();
    expect(notes.map((n) => n.slug)).toEqual(["2026-07-05-b", "2026-07-01-a"]);
  });

  it("returns null from getNote for a slug that does not exist", () => {
    expect(getNote("nonexistent")).toBeNull();
  });

  it("throws with a readable message when frontmatter fails validation", () => {
    writeNoteUnit("2026-07-02-bad", ["type: dream", "title: x", "date: 2026-07-02", 'summary: "x"', 'rem: "seven"'].join("\n"));
    expect(() => getNotes()).toThrow(/content\/notes\/2026-07-02-bad\/index\.md/);
    expect(() => getNotes()).toThrow(/rem/);
  });
});

describe("formatRecordId", () => {
  it("formats a dream as REM-NNN", () => {
    writeNoteUnit("d", ["type: dream", "title: x", "date: 2026-07-02", 'summary: "x"', "rem: 7"].join("\n"));
    expect(formatRecordId(getNote("d")!)).toBe("REM-007");
    fs.rmSync(NOTES_DIR, { recursive: true, force: true });
  });

  it("formats an incident as IR-NNN", () => {
    writeNoteUnit("i", ["type: incident", "title: x", "date: 2026-07-02", 'summary: "x"', "ir: 12"].join("\n"));
    expect(formatRecordId(getNote("i")!)).toBe("IR-012");
    fs.rmSync(NOTES_DIR, { recursive: true, force: true });
  });

  it("formats a note as its ISO date", () => {
    writeNoteUnit("n", ["type: note", "title: x", "date: 2026-07-02", 'summary: "x"'].join("\n"));
    expect(formatRecordId(getNote("n")!)).toBe("2026-07-02");
    fs.rmSync(NOTES_DIR, { recursive: true, force: true });
  });
});

describe("getRoomStatuses notes field", () => {
  afterEach(() => {
    fs.rmSync(NOTES_DIR, { recursive: true, force: true });
  });

  it("is null when there are no notes", () => {
    expect(getRoomStatuses().notes).toBeNull();
  });

  it("reports records count and latestId when notes exist", () => {
    writeNoteUnit("2026-07-01-a", ['type: note', "title: a", "date: 2026-07-01", 'summary: "a"'].join("\n"));
    writeNoteUnit("2026-07-05-b", ["type: dream", "title: b", "date: 2026-07-05", 'summary: "b"', "rem: 3"].join("\n"));
    const statuses = getRoomStatuses();
    expect(statuses.notes).toEqual({ records: 2, latestId: "REM-003" });
  });
});
```

Update the top-of-file `import` line for `./content` in `lib/content.test.ts` to also pull in `getNotes`, `getNote`, `formatRecordId`, `getRoomStatuses`:

```typescript
import { getPhotoRolls, getPhotoRoll, getReel, getNotes, getNote, formatRecordId, getRoomStatuses } from "./content";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/content.test.ts`
Expected: FAIL — `getNotes`/`getNote`/`formatRecordId` not exported.

- [ ] **Step 3: Implement**

Add to `lib/content.ts`, after the `/reel` section and before "走廊的构建期取数":

```typescript
// ——————————————————————————— /notes 档案室 ———————————————————————————
// 三种类型(note/dream/incident)共享一个 discriminated union frontmatter
// schema(noteRecordSchema,§2)。校验失败直接抛错,同 photoSetSchema/reelSchema
// 的处理——单作者站点,提前发现拼写错误好过悄悄丢内容,也是"故意写坏一个字段
// 构建应报错"这条完成标准的实现来源。正文走真正的 markdown 编译(notes-markdown.ts),
// 不是 toParagraphs() 的简单分段——notes 是长文章,not 短陈述句。

export type NoteRecordBase = {
  slug: string;
  title: string;
  date: string; // ISO
  summary: string;
  lang: "mixed" | "zh" | "en";
  html: string;
};

export type NoteNote = NoteRecordBase & { type: "note" };

export type NoteDream = NoteRecordBase & {
  type: "dream";
  rem: number;
  recorded: string | null;
  lucidity: number | null;
};

export type NoteIncident = NoteRecordBase & {
  type: "incident";
  ir: number;
  severity: number | null;
  status: "resolved" | "ongoing" | "wontfix";
};

export type NoteRecord = NoteNote | NoteDream | NoteIncident;

const NOTES_DIR_FOR_ASSETS = path.join(CONTENT_DIR, "notes");
const PUBLIC_NOTES_DIR = path.join(process.cwd(), "public", "notes");

function readNoteRecord(slug: string): NoteRecord | null {
  const unit = readUnit("notes", slug);
  if (!unit) return null;

  const result = noteRecordSchema.safeParse(unit.data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`content/notes/${slug}/index.md frontmatter 校验失败:\n${issues}`);
  }

  copyNoteAssets(NOTES_DIR_FOR_ASSETS, slug, PUBLIC_NOTES_DIR);
  const html = compileMarkdown(unit.body, slug);

  const base: NoteRecordBase = {
    slug,
    title: result.data.title,
    date: result.data.date.toISOString(),
    summary: result.data.summary,
    lang: result.data.lang,
    html,
  };

  if (result.data.type === "note") {
    return { ...base, type: "note" };
  }
  if (result.data.type === "dream") {
    return {
      ...base,
      type: "dream",
      rem: result.data.rem,
      recorded: result.data.recorded ? result.data.recorded.toISOString() : null,
      lucidity: result.data.lucidity ?? null,
    };
  }
  return {
    ...base,
    type: "incident",
    ir: result.data.ir,
    severity: result.data.severity ?? null,
    status: result.data.status,
  };
}

export function getNotes(): NoteRecord[] {
  let slugs: string[];
  try {
    slugs = fs
      .readdirSync(NOTES_DIR_FOR_ASSETS)
      .filter((name) => fs.statSync(path.join(NOTES_DIR_FOR_ASSETS, name)).isDirectory());
  } catch {
    return [];
  }
  const records = slugs
    .map((slug) => readNoteRecord(slug))
    .filter((r): r is NoteRecord => r !== null);
  records.sort((a, b) => b.date.localeCompare(a.date));
  return records;
}

export function getNote(slug: string): NoteRecord | null {
  return readNoteRecord(slug);
}

/** 编目行/仪表读数用的展示编号:REM-007 / IR-002 / 纯 ISO 日期(note 没有编号)。 */
export function formatRecordId(record: NoteRecord): string {
  if (record.type === "dream") return `REM-${String(record.rem).padStart(3, "0")}`;
  if (record.type === "incident") return `IR-${String(record.ir).padStart(3, "0")}`;
  return record.date.slice(0, 10);
}
```

Update `RoomStatuses` type (existing, in the "走廊的构建期取数" section):

```typescript
export type RoomStatuses = {
  now: { updatedAt: string } | null;
  lab: { experiments: number; ongoing: number } | null;
  notes: { records: number; latestId: string } | null;
  photos: { rolls: number; frames: number } | null;
  about: { resident: true } | null;
  reel: { favorites: number; logEntries: number } | null;
};
```

(unchanged shape — it already had this exact shape as dead code; only `getRoomStatuses()`'s body below changes.)

Update `getRoomStatuses()`'s `notes:` line from `notes: null,` to:

```typescript
    notes: (() => {
      const records = getNotes();
      return records.length
        ? { records: records.length, latestId: formatRecordId(records[0]) }
        : null;
    })(),
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/content.test.ts`
Expected: PASS — all new cases green, existing `getPhotoRolls`/`getPhotoRoll`/`getReel` cases unaffected.

- [ ] **Step 5: Run the full type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/content.ts lib/content.test.ts
git commit -m "feat(notes): add getNotes()/getNote()/formatRecordId(), wire RoomStatuses.notes"
```

---

## Task 4: `scripts/new-content/numbering.mjs` + `scripts/new-content/slug.mjs`

**Files:**
- Create: `scripts/new-content/numbering.mjs`
- Create: `scripts/new-content/numbering.test.mjs`
- Create: `scripts/new-content/slug.mjs`
- Create: `scripts/new-content/slug.test.mjs`

**Interfaces:**
- Produces: `nextNumber(notesDir: string, field: "rem" | "ir"): number`(扫描 `notesDir` 下所有 `*/index.md` 的 frontmatter,取该字段 `max + 1`,目录不存在或没有记录时返回 `1`);`slugify(title: string): string`;`dateSlug(date: Date, title: string): string`(格式 `YYYY-MM-DD-<slug>`,`title` 为空时退化为纯日期)。Task 6(CLI 编排入口)消费这两个模块。

- [ ] **Step 1: Write the failing tests**

Create `scripts/new-content/numbering.test.mjs`:

```javascript
import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { nextNumber } from "./numbering.mjs";

describe("nextNumber", () => {
  let root;

  afterEach(() => {
    if (root) fs.rmSync(root, { recursive: true, force: true });
  });

  it("returns 1 when the directory does not exist", () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "numbering-"));
    expect(nextNumber(path.join(root, "missing"), "rem")).toBe(1);
  });

  it("returns 1 when no existing record has the field", () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "numbering-"));
    const unit = path.join(root, "2026-07-01-a");
    fs.mkdirSync(unit, { recursive: true });
    fs.writeFileSync(path.join(unit, "index.md"), "---\ntype: note\n---\n");
    expect(nextNumber(root, "rem")).toBe(1);
  });

  it("returns max + 1 across multiple records", () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "numbering-"));
    const a = path.join(root, "2026-07-01-a");
    const b = path.join(root, "2026-07-02-b");
    fs.mkdirSync(a, { recursive: true });
    fs.mkdirSync(b, { recursive: true });
    fs.writeFileSync(path.join(a, "index.md"), "---\ntype: dream\nrem: 3\n---\n");
    fs.writeFileSync(path.join(b, "index.md"), "---\ntype: dream\nrem: 7\n---\n");
    expect(nextNumber(root, "rem")).toBe(8);
  });

  it("only counts the requested field, ignoring the other", () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "numbering-"));
    const a = path.join(root, "2026-07-01-a");
    fs.mkdirSync(a, { recursive: true });
    fs.writeFileSync(path.join(a, "index.md"), "---\ntype: incident\nir: 9\n---\n");
    expect(nextNumber(root, "rem")).toBe(1);
    expect(nextNumber(root, "ir")).toBe(10);
  });
});
```

Create `scripts/new-content/slug.test.mjs`:

```javascript
import { describe, it, expect } from "vitest";
import { slugify, dateSlug } from "./slug.mjs";

describe("slugify", () => {
  it("lowercases and hyphenates an English title", () => {
    expect(slugify("Why Convenience Store Lights Feel Honest")).toBe(
      "why-convenience-store-lights-feel-honest",
    );
  });

  it("collapses punctuation and repeated separators", () => {
    expect(slugify("node_modules 被 iCloud 蒸发事故!!")).toBe("node-modules-被-icloud-蒸发事故");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("  -- leading and trailing --  ")).toBe("leading-and-trailing");
  });
});

describe("dateSlug", () => {
  it("prefixes the slugified title with an ISO date", () => {
    const date = new Date("2026-08-25T12:00:00Z");
    expect(dateSlug(date, "A Test Title")).toBe("2026-08-25-a-test-title");
  });

  it("falls back to a bare date when the title slugifies to empty", () => {
    const date = new Date("2026-08-25T12:00:00Z");
    expect(dateSlug(date, "!!!")).toBe("2026-08-25");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run scripts/new-content/numbering.test.mjs scripts/new-content/slug.test.mjs`
Expected: FAIL — modules don't exist.

- [ ] **Step 3: Implement**

Create `scripts/new-content/numbering.mjs`:

```javascript
// REM/IR 编号分配(notes archive spec §3)。规则:扫描 content/notes 现有
// frontmatter 取 max + 1,不设持久化计数器文件——档案纪律"只追加、编号永不
// 复用"本身就让目录内容成为唯一权威账本。

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export function nextNumber(notesDir, field) {
  let slugs;
  try {
    slugs = fs
      .readdirSync(notesDir)
      .filter((name) => fs.statSync(path.join(notesDir, name)).isDirectory());
  } catch {
    return 1;
  }
  let max = 0;
  for (const slug of slugs) {
    const file = path.join(notesDir, slug, "index.md");
    let raw;
    try {
      raw = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const { data } = matter(raw);
    const value = data?.[field];
    if (typeof value === "number" && value > max) max = value;
  }
  return max + 1;
}
```

Create `scripts/new-content/slug.mjs`:

```javascript
// slug 生成(notes archive spec §5)。允许中日韩字符直接进 slug(不强制音译成
// 英文)——脚手架的目标是"自动生成规范的 slug",不是"逼作者先想一个英文短语"。

export function slugify(title) {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // 去掉重音符号
    .replace(/[^a-z0-9一-鿿]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function dateSlug(date, title) {
  const day = date.toISOString().slice(0, 10);
  const base = slugify(title);
  return base ? `${day}-${base}` : day;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run scripts/new-content/numbering.test.mjs scripts/new-content/slug.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/new-content/numbering.mjs scripts/new-content/numbering.test.mjs scripts/new-content/slug.mjs scripts/new-content/slug.test.mjs
git commit -m "feat(notes): add scaffold numbering + slug helpers"
```

---

## Task 5: `scripts/new-content/templates.mjs`

**Files:**
- Create: `scripts/new-content/templates.mjs`
- Create: `scripts/new-content/templates.test.mjs`

**Interfaces:**
- Consumes: nothing new (pure functions over plain arguments).
- Produces: `noteTemplate({ title, date, summary })`、`dreamTemplate({ title, date, rem, summary, recorded, lucidity })`、`incidentTemplate({ title, date, ir, summary, severity })`、`rollTemplate({ title, date })` — 每个返回 `{ data: object, body: string }`。Task 6(CLI 编排入口)用 `matter.stringify(body, data)` 把这两部分拼成最终写入的文件内容。

- [ ] **Step 1: Write the failing tests**

Create `scripts/new-content/templates.test.mjs`:

```javascript
import { describe, it, expect } from "vitest";
import { noteTemplate, dreamTemplate, incidentTemplate, rollTemplate } from "./templates.mjs";

describe("noteTemplate", () => {
  it("builds note frontmatter with lang defaulted to mixed", () => {
    const { data, body } = noteTemplate({ title: "x", date: "2026-08-25", summary: "y" });
    expect(data).toEqual({ title: "x", date: "2026-08-25", type: "note", summary: "y", lang: "mixed" });
    expect(body).toBe("\n");
  });
});

describe("dreamTemplate", () => {
  it("includes recorded/lucidity when provided", () => {
    const { data } = dreamTemplate({
      title: "dream",
      date: "2026-08-25",
      rem: 1,
      summary: "s",
      recorded: "2026-08-25T06:00:00.000Z",
      lucidity: 3,
    });
    expect(data).toEqual({
      title: "dream",
      date: "2026-08-25",
      type: "dream",
      rem: 1,
      summary: "s",
      lang: "mixed",
      recorded: "2026-08-25T06:00:00.000Z",
      lucidity: 3,
    });
  });

  it("omits recorded/lucidity when not provided", () => {
    const { data } = dreamTemplate({ title: "dream", date: "2026-08-25", rem: 1, summary: "s" });
    expect(data).not.toHaveProperty("recorded");
    expect(data).not.toHaveProperty("lucidity");
  });
});

describe("incidentTemplate", () => {
  it("defaults status to ongoing and generates a timeline/root cause/lessons skeleton", () => {
    const { data, body } = incidentTemplate({ title: "x", date: "2026-08-25", ir: 1, summary: "s" });
    expect(data.status).toBe("ongoing");
    expect(data).not.toHaveProperty("severity");
    expect(body).toContain("## timeline");
    expect(body).toContain("## root cause");
    expect(body).toContain("## lessons");
  });

  it("includes severity when provided", () => {
    const { data } = incidentTemplate({ title: "x", date: "2026-08-25", ir: 1, summary: "s", severity: 2 });
    expect(data.severity).toBe(2);
  });
});

describe("rollTemplate", () => {
  it("builds a minimal photo-roll frontmatter with no photos[] array", () => {
    const { data, body } = rollTemplate({ title: "x", date: "2026-08-25" });
    expect(data).toEqual({ title: "x", date: "2026-08-25" });
    expect(body).toBe("\n");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run scripts/new-content/templates.test.mjs`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

Create `scripts/new-content/templates.mjs`:

```javascript
// frontmatter 模板构造(notes archive spec §5)。纯函数,不碰文件系统——
// scripts/new-content.mjs 负责把返回值用 gray-matter 的 stringify 写成文件。

export function noteTemplate({ title, date, summary }) {
  return {
    data: { title, date, type: "note", summary, lang: "mixed" },
    body: "\n",
  };
}

export function dreamTemplate({ title, date, rem, summary, recorded, lucidity }) {
  const data = { title, date, type: "dream", rem, summary, lang: "mixed" };
  if (recorded) data.recorded = recorded;
  if (lucidity !== undefined) data.lucidity = lucidity;
  return { data, body: "\n" };
}

export function incidentTemplate({ title, date, ir, summary, severity }) {
  const data = { title, date, type: "incident", ir, summary, lang: "mixed", status: "ongoing" };
  if (severity !== undefined) data.severity = severity;
  const body = ["## timeline", "", "", "## root cause", "", "", "## lessons", "", ""].join("\n");
  return { data, body };
}

export function rollTemplate({ title, date }) {
  return {
    data: { title, date },
    body: "\n",
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run scripts/new-content/templates.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/new-content/templates.mjs scripts/new-content/templates.test.mjs
git commit -m "feat(notes): add scaffold frontmatter templates"
```

---

## Task 6: `scripts/new-content.mjs` — CLI orchestrator + `package.json` scripts

**Files:**
- Create: `scripts/new-content.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `nextNumber` (Task 4), `slugify`/`dateSlug` (Task 4), `noteTemplate`/`dreamTemplate`/`incidentTemplate`/`rollTemplate` (Task 5), `matter.stringify` (existing `gray-matter` dependency).
- Produces: the four `pnpm new:*` commands. Nothing downstream in this plan depends on this task's exports (it's a leaf CLI entry point), but Task 12 (首发内容) runs it.

**Why this task has no `vitest` unit test:** the file's only logic beyond wiring is `readline` interactive I/O, which is exercised end-to-end in Step 3 below via piped stdin — the same reason `app/reel/page.tsx` (reel plan Task 5) used a manual smoke test instead of a unit test for something that can't be meaningfully mocked. All the actual decision logic (numbering, slugging, template shape) already has unit coverage from Task 4/5.

- [ ] **Step 1: Add the four `package.json` scripts**

Edit `package.json`, add to `scripts` (after `"sync:images"`):

```json
    "new:note": "node scripts/new-content.mjs --type note",
    "new:dream": "node scripts/new-content.mjs --type dream",
    "new:incident": "node scripts/new-content.mjs --type incident",
    "new:roll": "node scripts/new-content.mjs --type roll",
```

- [ ] **Step 2: Implement**

Create `scripts/new-content.mjs`:

```javascript
#!/usr/bin/env node
// scripts/new-content.mjs — 内容脚手架 CLI 入口(notes archive spec §5)。
// 四个子命令(note/dream/incident/roll)共用一个入口,靠 --type 分流。
// 交互问答用 node:readline/promises,不引入额外依赖。目标文件夹已存在时拒绝
// 执行——档案是追加式的,脚手架不该有意外覆盖已发布记录的路径。

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import matter from "gray-matter";
import { nextNumber } from "./new-content/numbering.mjs";
import { dateSlug } from "./new-content/slug.mjs";
import {
  noteTemplate,
  dreamTemplate,
  incidentTemplate,
  rollTemplate,
} from "./new-content/templates.mjs";

const NOTES_DIR = path.join(process.cwd(), "content", "notes");
const PHOTOS_DIR = path.join(process.cwd(), "content", "photos");

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

async function ask(rl, question) {
  const answer = await rl.question(question);
  return answer.trim();
}

function writeUnit(dir, slug, data, body, kind) {
  if (fs.existsSync(dir)) {
    console.error(`${kind}/${slug} already exists, aborting (archive is append-only).`);
    process.exit(1);
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.md"), matter.stringify(body, data));
  console.log(`created ${kind}/${slug}/index.md`);
}

async function main() {
  const typeIndex = process.argv.indexOf("--type");
  const type = typeIndex !== -1 ? process.argv[typeIndex + 1] : null;
  if (!["note", "dream", "incident", "roll"].includes(type)) {
    console.error("Usage: node scripts/new-content.mjs --type <note|dream|incident|roll>");
    process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const date = todayISO();

    if (type === "roll") {
      const title = await ask(rl, "roll title: ");
      const slug = dateSlug(new Date(), title);
      const { data, body } = rollTemplate({ title, date });
      writeUnit(path.join(PHOTOS_DIR, slug), slug, data, body, "content/photos");
      return;
    }

    const titlePrompt = type === "dream" ? "dream title (optional, enter for 'dream'): " : "title: ";
    const titleInput = await ask(rl, titlePrompt);
    const title = titleInput || (type === "dream" ? "dream" : titleInput);
    const slug = dateSlug(new Date(), title || type);
    const summary = await ask(rl, "summary: ");

    let data, body;
    if (type === "note") {
      ({ data, body } = noteTemplate({ title, date, summary }));
    } else if (type === "dream") {
      const rem = nextNumber(NOTES_DIR, "rem");
      console.log(`assigned REM-${String(rem).padStart(3, "0")}`);
      const recordedInput = await ask(rl, "recorded (ISO datetime, enter for now): ");
      const recorded = recordedInput || new Date().toISOString();
      const lucidityInput = await ask(rl, "lucidity 1-5 (enter to skip): ");
      const lucidity = lucidityInput ? Number(lucidityInput) : undefined;
      ({ data, body } = dreamTemplate({ title, date, rem, summary, recorded, lucidity }));
    } else {
      const ir = nextNumber(NOTES_DIR, "ir");
      console.log(`assigned IR-${String(ir).padStart(3, "0")}`);
      const severityInput = await ask(rl, "severity 1-3 (enter to skip): ");
      const severity = severityInput ? Number(severityInput) : undefined;
      ({ data, body } = incidentTemplate({ title, date, ir, summary, severity }));
    }

    writeUnit(path.join(NOTES_DIR, slug), slug, data, body, "content/notes");
  } finally {
    rl.close();
  }
}

main();
```

- [ ] **Step 3: End-to-end smoke test via piped stdin**

Run each of the four commands with piped answers against a throwaway title (delete the generated folders afterward — nothing here should be committed yet):

```bash
printf 'scaffold smoke test\na quick summary\n' | pnpm new:note
cat content/notes/$(date +%Y-%m-%d)-scaffold-smoke-test/index.md
rm -rf content/notes/$(date +%Y-%m-%d)-scaffold-smoke-test

printf '\na quick summary\n\n\n' | pnpm new:dream
cat content/notes/$(date +%Y-%m-%d)-dream/index.md
rm -rf content/notes/$(date +%Y-%m-%d)-dream

printf 'scaffold smoke incident\na quick summary\n\n' | pnpm new:incident
cat content/notes/$(date +%Y-%m-%d)-scaffold-smoke-incident/index.md
rm -rf content/notes/$(date +%Y-%m-%d)-scaffold-smoke-incident

printf 'scaffold smoke roll\n' | pnpm new:roll
cat content/photos/$(date +%Y-%m-%d)-scaffold-smoke-roll/index.md
rm -rf content/photos/$(date +%Y-%m-%d)-scaffold-smoke-roll
```

Expected for each: a `created …/index.md` line printed, the file contains correctly-shaped YAML frontmatter (spot-check `type`, and for dream/incident the `rem: 1` / `ir: 1` — assuming no other notes exist yet at this point in the plan, since Task 12 hasn't run), and — for the incident case — a body containing `## timeline` / `## root cause` / `## lessons`.

Then confirm REM numbering actually increments across two real runs (spec §12's explicit acceptance item — Task 4's unit tests cover `nextNumber()` in isolation with fixtures, this is the end-to-end confirmation through the real CLI):

```bash
printf '\nfirst\n\n\n' | pnpm new:dream
FIRST=$(ls -d content/notes/*-dream 2>/dev/null | head -1)
grep '^rem:' "$FIRST/index.md"
mv "$FIRST" "${FIRST}-first"

printf '\nsecond\n\n\n' | pnpm new:dream
grep '^rem:' content/notes/*-dream/index.md
```

Expected: the second `rem:` value is exactly one more than the first (both should be `rem: 1` and `rem: 2` respectively, since nothing else has claimed a `rem` at this point in the plan). Clean up both:

```bash
rm -rf "${FIRST}-first" content/notes/*-dream
```

Then confirm the append-only guard:

```bash
mkdir -p content/notes/$(date +%Y-%m-%d)-guard-test
printf 'guard test\nx\n' | pnpm new:note
```

Wait — this creates a *different* slug (`guard-test` vs whatever `pnpm new:note` slugifies "guard test" to, which is the same string). Confirm the command exits non-zero with an `already exists, aborting` message, then clean up:

```bash
rm -rf content/notes/$(date +%Y-%m-%d)-guard-test
```

- [ ] **Step 4: Run the type check**

Run: `npx tsc --noEmit`
Expected: PASS (this file is plain `.mjs`, not type-checked directly, but confirms nothing else broke).

- [ ] **Step 5: Commit**

```bash
git add scripts/new-content.mjs package.json
git commit -m "feat(notes): add new-content.mjs scaffold CLI (note/dream/incident/roll)"
```

---

## Task 7: `/notes` list page — `app/notes/page.tsx`

**Files:**
- Create: `app/notes/page.tsx`

**Interfaces:**
- Consumes: `getNotes`, `formatRecordId`, `type NoteRecord` (Task 3); `RoomShell` (unchanged); `isWillsleep` (unchanged).
- Produces: the `/notes` route (list). Nothing downstream depends on this task.

- [ ] **Step 1: Write the page**

Create `app/notes/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RoomShell } from "@/components/room-shell";
import { getNotes, formatRecordId, type NoteRecord } from "@/lib/content";
import type { Locale } from "@/lib/i18n/strings";
import { isWillsleep } from "@/lib/site";

// /notes — 档案室(DESIGN §5)。按年分组,mono 编目行,类型只靠编号前缀区分。
// 房间名不外泄到 yueqiao 构建(红线 2 的身份切分):那边这条路由只是一个 404

export const metadata: Metadata = isWillsleep
  ? { title: "notes · The Sleep Lab", description: "记录档案:观察 / 梦境 / 事故报告" }
  : { title: "Not found · Yueqiao Dev" };

/** 编目行前缀(读数部分):REM-007 · 2026-07-02 / IR-002 · SEV-3 / 纯日期(DESIGN §5 逐字规格)。 */
function readoutPrefix(record: NoteRecord): string {
  const id = formatRecordId(record);
  if (record.type === "dream") return `${id} · ${record.date.slice(0, 10)}`;
  if (record.type === "incident") {
    const mid = record.severity != null ? `SEV-${record.severity}` : record.status;
    return `${id} · ${mid}`;
  }
  return id; // note: formatRecordId() 已经就是它的日期
}

export default function NotesPage({ locale = "canonical" }: { locale?: Locale }) {
  if (!isWillsleep) notFound();

  const records = getNotes();
  if (records.length === 0) notFound();

  const byYear = new Map<string, NoteRecord[]>();
  for (const record of records) {
    const year = record.date.slice(0, 4);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(record);
  }

  return (
    <RoomShell room="notes" locale={locale}>
      {[...byYear.entries()].map(([year, yearRecords]) => (
        <section key={year} className="mt-12 first:mt-0">
          <h2 className="font-mono text-xs text-white/40">{year}</h2>
          <ul className="mt-6 space-y-3 font-sans">
            {yearRecords.map((record) => (
              <li key={record.slug}>
                <Link href={`/notes/${record.slug}`} className="group block">
                  <span className="font-mono text-xs text-white/40">{readoutPrefix(record)}</span>{" "}
                  <span className="text-white/70 transition-colors duration-200 group-hover:text-white group-focus-visible:text-white">
                    {record.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </RoomShell>
  );
}
```

- [ ] **Step 2: Run the type check and lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add app/notes/page.tsx
git commit -m "feat(notes): add /notes list page"
```

---

## Task 8: `/notes/[slug]` article page — `app/notes/[slug]/page.tsx`

**Files:**
- Create: `app/notes/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getNote`, `getNotes`, `formatRecordId`, `type NoteRecord` (Task 3); `t`, `type Locale` (Task 9 adds the string keys this consumes — see note below); `RoomShell`; `isWillsleep`.
- Produces: the `/notes/[slug]` route. Nothing downstream depends on this task.

**Ordering note:** this task references `t("notes.record.recorded", locale)` etc., which Task 9 adds to `lib/i18n/strings.ts`. Do Task 9 first if executing out of plan order, or accept a transient `tsc` failure between this task's commit and Task 9's — either is fine since both land before Task 14's full verification; but if running strictly in this plan's order, swap: **do Task 9 before Task 8** in that case. (Numbering kept as written because the reference implementation below already assumes the keys exist.)

- [ ] **Step 1: Write the page**

Create `app/notes/[slug]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoomShell } from "@/components/room-shell";
import { getNote, getNotes, formatRecordId } from "@/lib/content";
import { t, type Locale } from "@/lib/i18n/strings";
import { isWillsleep } from "@/lib/site";

// /notes/[slug] — 单篇记录(DESIGN §5)。静态导出:动态路由必须
// generateStaticParams + dynamicParams=false(同 /lab/[slug] 现有模式)。

export const dynamicParams = false;

export function generateStaticParams() {
  return getNotes().map((record) => ({ slug: record.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  if (!isWillsleep) return { title: "Not found · Yueqiao Dev" };
  const { slug } = await params;
  const record = getNote(slug);
  if (!record) return { title: "Not found · The Sleep Lab" };
  return { title: `${record.title} · The Sleep Lab`, description: record.summary };
}

export default async function NotePage({
  params,
  locale = "canonical",
}: {
  params: Promise<{ slug: string }>;
  locale?: Locale;
}) {
  if (!isWillsleep) notFound();
  const { slug } = await params;
  const record = getNote(slug);
  if (!record) notFound();

  return (
    <RoomShell room="notes" locale={locale} className="max-w-prose">
      <p className="font-mono text-xs text-white/40">{formatRecordId(record)}</p>

      {record.type === "dream" && (record.recorded || record.lucidity != null) && (
        <p className="mt-1 font-mono text-xs text-white/40">
          {record.recorded &&
            `${t("notes.record.recorded", locale)}: ${record.recorded.slice(0, 16).replace("T", " ")}`}
          {record.recorded && record.lucidity != null && " · "}
          {record.lucidity != null && `${t("notes.record.lucidity", locale)}: ${record.lucidity}/5`}
        </p>
      )}

      {record.type === "incident" && (
        <p className="mt-1 font-mono text-xs text-white/40">
          {record.severity != null && `${t("notes.record.severity", locale)}: SEV-${record.severity}`}
          {record.severity != null && " · "}
          {t("notes.record.status", locale)}: {record.status}
        </p>
      )}

      <h1 className="mt-6 font-serif text-2xl text-white/90">{record.title}</h1>
      <div
        className="mt-8 font-serif leading-[1.75] text-white/70"
        dangerouslySetInnerHTML={{ __html: record.html }}
      />
    </RoomShell>
  );
}
```

- [ ] **Step 2: Run the type check**

Run: `npx tsc --noEmit`
Expected: FAIL until Task 9 lands the `notes.record.*` string keys (or PASS if Task 9 was done first per the ordering note above) — either way, do not consider this task done until `tsc` is clean, which requires Task 9's keys to exist.

- [ ] **Step 3: Commit**

```bash
git add "app/notes/[slug]/page.tsx"
git commit -m "feat(notes): add /notes/[slug] article page"
```

---

## Task 9: i18n strings — `notes.record.*` labels

**Files:**
- Modify: `lib/i18n/strings.ts`

**Interfaces:**
- Produces: string keys `"notes.record.recorded"`, `"notes.record.lucidity"`, `"notes.record.severity"`, `"notes.record.status"` callable via `t(key, locale)`. Task 8 depends on these exact names.

- [ ] **Step 1: Add the string keys**

Edit `lib/i18n/strings.ts`, add after the existing `"reel.section.log"` entry (grouped before the `// /lab 实验区` comment block):

```typescript
  // /notes 档案室(spec docs/superpowers/specs/2026-08-25-notes-archive-design.md §6)
  "notes.record.recorded": { canonical: "recorded", zh: "记录于", en: "recorded" },
  "notes.record.lucidity": { canonical: "lucidity", zh: "清醒度", en: "lucidity" },
  "notes.record.severity": { canonical: "severity", zh: "严重度", en: "severity" },
  "notes.record.status": { canonical: "status", zh: "状态", en: "status" },
```

- [ ] **Step 2: Run the type check**

Run: `npx tsc --noEmit`
Expected: PASS — this also confirms Task 8's `t(...)` calls resolve to valid `StringKey`s.

- [ ] **Step 3: Commit**

```bash
git add lib/i18n/strings.ts
git commit -m "feat(notes): add notes.record.* i18n strings"
```

---

## Task 10: RSS — `app/feed.xml/route.ts`

**Files:**
- Create: `app/feed.xml/route.ts`

**Interfaces:**
- Consumes: `getNotes`, `formatRecordId`, `type NoteRecord` (Task 3); `isWillsleep`, `SITE_URL`, `SITE_COPY`, `siteName` (`lib/site.ts`, unchanged).
- Produces: the `/feed.xml` route. Nothing downstream depends on this task.

- [ ] **Step 1: Write the route**

Create `app/feed.xml/route.ts`:

```typescript
import { getNotes, formatRecordId, type NoteRecord } from "@/lib/content";
import { isWillsleep, SITE_URL, SITE_COPY, siteName } from "@/lib/site";

// /feed.xml — /notes 的 RSS(DESIGN §5/§7.5)。静态 GET(Next 16 静态导出支持
// Route Handler 的 GET 构建期产物)。只收 canonical,zh/en 不进 feed。
//
// 这是全站级路由,不是某个房间页面——双站门控在这里的形态和 sitemap.ts 一样:
// yueqiao 构建返回一份不带 willsleep 专属内容的通用 feed,而不是直接 404,
// 保持和 app/sitemap.ts 现有模式一致(那边 yueqiao 也是"只留首页"而不是报错)。

export const dynamic = "force-static";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function itemTitle(record: NoteRecord): string {
  const id = formatRecordId(record);
  return record.type === "note" ? record.title : `${id} · ${record.title}`;
}

export function GET() {
  const site = SITE_COPY[siteName] ?? SITE_COPY.willsleep;
  const records = isWillsleep ? getNotes() : [];

  const items = records
    .map((record) => {
      const url = `${SITE_URL}/notes/${record.slug}/`;
      return [
        "  <item>",
        `    <title>${escapeXml(itemTitle(record))}</title>`,
        `    <link>${url}</link>`,
        `    <guid>${url}</guid>`,
        `    <pubDate>${new Date(record.date).toUTCString()}</pubDate>`,
        `    <description>${escapeXml(record.summary)}</description>`,
        "  </item>",
      ].join("\n");
    })
    .join("\n");

  const channelTitle = isWillsleep ? `notes · ${site.title}` : site.title;
  const channelLink = `${SITE_URL}${isWillsleep ? "/notes/" : "/"}`;
  const channelDescription = isWillsleep ? "记录档案:观察 / 梦境 / 事故报告" : site.tagline;

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "<channel>",
    `  <title>${escapeXml(channelTitle)}</title>`,
    `  <link>${channelLink}</link>`,
    `  <description>${escapeXml(channelDescription)}</description>`,
    items,
    "</channel>",
    "</rss>",
  ]
    .filter(Boolean)
    .join("\n");

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
```

- [ ] **Step 2: Run the type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Manual smoke test**

Run: `pnpm dev`, then in another shell: `curl -s http://localhost:3000/feed.xml | head -20`
Expected: valid-looking XML with `<rss version="2.0">`; if no `content/notes/**` exists yet at this point in the plan (Task 12 hasn't run), `<channel>` has no `<item>` blocks, which is correct — an empty archive means an empty feed, not an error.

- [ ] **Step 4: Commit**

```bash
git add app/feed.xml/route.ts
git commit -m "feat(notes): add /feed.xml RSS route"
```

---

## Task 11: 首发内容 — publish the first note, REM-001, IR-001

**Files:**
- Create: `content/notes/<slug-1>/index.md` (note)
- Create: `content/notes/<slug-2>/index.md` (REM-001)
- Create: `content/notes/<slug-3>/index.md` (IR-001)
- Modify: `lib/rooms.ts`

**Interfaces:** none — this task produces content, not code.

**这是完成标准的一部分(spec §11),必须用脚手架生成,不能手写新建文件。** 用脚手架生成文件夹与 frontmatter 骨架之后,再用 `Edit` 工具把正文/字段填充进去——这样 `git log` 能看出文件是"脚手架生成 → 编辑填充"两步,而不是一次性手写。

- [ ] **Step 1: Scaffold the first note**

Run interactively (or pipe answers): `pnpm new:note`
- title: `造这套档案室系统本身的一点感想`(或你确认过的实际标题)
- summary: 一句话摘要,例如"这套只追加、编号永不复用的记录系统,到底在防什么"

This creates `content/notes/<today>-<slug>/index.md`. Edit that file's body (below the frontmatter) with a first-person reflection on building this archive system — the append-only discipline, the REM/IR numbering, why a personal site needs something this rigid. Use real markdown (at least one heading or emphasis, so Task 14's "compiles real markdown" acceptance item has something to point at). Length: a few paragraphs, not padding — matches DESIGN §5's "可短至三句" ethos; there's no minimum-length requirement.

- [ ] **Step 2: Scaffold REM-001 as an explicit placeholder**

Run: `pnpm new:dream`
- title: enter blank (defaults to `dream`), or a short question-form placeholder like `还没顾上写的一夜`
- summary: `占位记录,正文待补`
- recorded: enter blank (defaults to now)
- lucidity: enter blank (skip)

This assigns `rem: 1` (first dream in the archive) and creates `content/notes/<today>-dream/index.md` (or the slug matching whatever title was given). Edit the body to explicitly say it's a placeholder — do not fabricate a dream. Something like:

```markdown
这一条还没顾上写。晨间快写的窗口错过了,细节已经模糊——按档案纪律,不编一个来凑数,先占住 REM-001 这个编号,之后真的记住一个梦再用 `addendum:` 或直接编辑正文补上。
```

This is explicitly-labeled placeholder content, not fabricated content passed off as real — satisfies both "不许假" and "完成标准要求 REM-001 存在" simultaneously (spec §11).

- [ ] **Step 3: Scaffold IR-001 with the real iCloud incident**

Run: `pnpm new:incident`
- title: `node_modules 被 iCloud 蒸发事故`
- summary: `iCloud Drive 把 node_modules 判定为可驱逐文件清空,构建挂死在 0% CPU`
- severity: `2`(或你认为合适的等级 — 阻断了本机构建,但不是数据丢失级别的事故,`ongoing`/`resolved` 状态视实际是否已经彻底解决而定,scaffold 默认写 `ongoing`,如果这个坑已经修完可以在填充正文后把 frontmatter 的 `status` 手动改成 `resolved`)

This assigns `ir: 1` and generates the `## timeline` / `## root cause` / `## lessons` skeleton. Fill it in with the real 2026-07-02 incident, cross-referencing the repo's own memory record (`icloud-drive-build-hazard`) and `docs/superpowers/specs/2026-08-22-photos-darkroom-design.md` (Task 3 of that plan fixed a related iCloud dataless-file hang — check it for factual details worth citing, e.g. `brctl download` / dataless-file detection). Example skeleton fill:

```markdown
## timeline

2026-07-02:构建/依赖安装过程中开始挂死,进程停在 0% CPU 不动。排查发现
`node_modules` 下大量文件被 iCloud Drive 标记为 dataless(本地已驱逐,仅云端
保留占位),读取这些文件时进程在等待 iCloud 物化文件,没有超时机制。同一次
驱逐里,`.env` 相关文件也被孤立。

## root cause

iCloud Drive 的存储优化会在磁盘紧张时把不常访问的文件标记为可驱逐(dataless),
`node_modules` 体积大、文件多、访问模式对 iCloud 的"最近使用"判断不友好,
成为重灾区。Node 工具链没有为"文件存在但需要先等云端下载"这种状态设计
容错,直接卡死等 I/O。

## lessons

- iCloud 同步的目录不适合放 `node_modules` 这类大量小文件、频繁读写的依赖树
- 后续给同类构建脚本加超时 + dataless 检测(`ls -lO` 判断 + `brctl download`
  主动拉取),不再无限等——`scripts/sync-images/icloud.mjs` 就是这个教训的
  直接产物
- `.env` 类文件即使体积小也可能被同一次驱逐连带影响,不能假设"小文件不会丢"
```

(实际填写时以 memory 记录与自己的实际经历为准,记忆不完整的地方标注"记忆不完整",不要编造未发生过的细节。)

- [ ] **Step 4: Flip `lib/rooms.ts` open to true**

Edit `lib/rooms.ts`:

```typescript
  { id: "notes", href: "/notes", open: true }, // 第 4 期(2026-08-25 内容上线)
```

(同时把这一行现有的过期注释"第 3 期"改成"第 4 期"——期 3/4 已在 2026-08-22 对调,`lib/rooms.ts` 当时漏改这一处。)

- [ ] **Step 5: Verify the room renders**

Run: `pnpm dev`, visit `http://localhost:3000/notes` and `http://localhost:3000/` (corridor).
Expected:
- `/notes` shows three entries under the current year, correctly prefixed (`REM-001 · <date> · <title>`, `IR-001 · SEV-2 · <title>` or whatever severity you chose, `<date> · <title>` for the plain note).
- Clicking each entry opens its article page with compiled markdown and the correct readout line.
- The corridor's `notes` door now renders (room is `open: true`) and its hover/focus peek readout shows `notes: 3 records · latest REM-001`(或 `IR-001`,取决于三者中哪个的 `date` 最新——`getRoomStatuses().notes.latestId` 取的是按 `date` 排序后的第一条,不是发布顺序).

- [ ] **Step 6: Commit**

```bash
git add content/notes lib/rooms.ts
git commit -m "content(notes): publish first note, REM-001, IR-001; open the room"
```

---

## Task 12: 文档同步 — DESIGN.md / BUILD-LOG.md

**Files:**
- Modify: `docs/DESIGN.md`
- Modify: `docs/BUILD-LOG.md`

- [ ] **Step 1: `DESIGN.md` §9 期 4 完成标准打勾**

把 §9 表格里期 4 那一行的"完成标准"列:

```
发布第一篇 note、第一条 REM 与第一份 IR(均由脚手架创建);故意写坏一个字段,构建报错且指明文件;feed.xml 可订阅
```

改成(标注哪些已经达成,不是简单删掉原文字):

```
✅ 发布第一篇 note、第一条 REM 与第一份 IR(均由脚手架创建);✅ 故意写坏一个字段,构建报错且指明文件(见 Task 14 验证);✅ feed.xml 可订阅
```

- [ ] **Step 2: `BUILD-LOG.md` 期 4 状态行**

把现状总览表格里这一行:

```
| 4 | /notes 档案室 | ⬜ | ⬜ | ⬜ | ⬜ | 排在 /photos 之后(round #4 决定) |
```

改成:

```
| 4 | /notes 档案室 | ✅ | ✅ | ✅ | ⬜ | 内容库管线、脚手架、页面、RSS 均已实现并本机验证;首篇 note/REM-001/IR-001 已发布,`lib/rooms.ts` 的 `open` 已翻真;待走 PR 流程合并 |
```

(`merge` 格是否打勾取决于走完 `superpowers:finishing-a-development-branch` 后的实际合并结果,这里先留空。)

- [ ] **Step 3: 顺手订正 BUILD-LOG.md 期 2/3/reel 已经过期的 merge 列**

开工前核实发现(spec §0/§13):PR #2(/lab)、PR #3(/photos)、PR #4(/reel)三者实际都已合并(`gh pr view` 分别确认 mergedAt 2026-08-22/2026-08-23/2026-08-23),但现状总览表格当时还标着 🟡/⬜。把这三行的 merge 列改成 ✅,并把备注文字改成反映"已合并"而不是"待合并":

```
| 2 | /lab 实验区 | ✅ | ✅ | ✅ | ✅ | EXP-001~003 全部实现,[PR #2](https://github.com/WillWYQ/homePage/pull/2) 已于 2026-08-22 合并 |
| — | infra · CI/CD 完善 | ✅ | ✅ | ✅ | ✅ | 直接在 main 上做的,没走 worktree |
| 3 | /photos 暗房 | ✅ | ✅ | ✅ | ✅ | 管线与页面已实现、本机验证,[PR #3](https://github.com/WillWYQ/homePage/pull/3) 已于 2026-08-23 合并;R2 仍未配置、无真实素材,内容上线待用户完成 R2 配置后自行运行 `pnpm sync:images` |
| — | /reel 卷带间 | ✅ | ✅ | ✅ | ✅ | 两处判断已确认(均按 spec 原建议),[PR #4](https://github.com/WillWYQ/homePage/pull/4) 已于 2026-08-23 合并;内容未上线,`open` 仍为 `false` |
```

(如果这三行在你执行到这一步时已经是这个状态——比如另一个会话已经先做了这次订正——跳过这一步,不要重复编辑。)

- [ ] **Step 4: Commit**

```bash
git add docs/DESIGN.md docs/BUILD-LOG.md
git commit -m "docs: sync DESIGN.md/BUILD-LOG.md for /notes archive delivery"
```

---

## Task 13: 全量验证

**Files:** 无新改动;仅验证。

- [ ] **Step 1: 类型检查 + lint + 单元测试**

Run: `npx tsc --noEmit`
Expected: 无错误。
Run: `pnpm lint`
Expected: 无错误。
Run: `pnpm test`
Expected: 全部通过(Task 1/2/3/4/5 累计的新测试用例,外加既有的 photos/reel 测试全部保持绿)。

- [ ] **Step 2: 双域名构建**

Run: `pnpm build:willsleep`
Expected: 构建成功;`/notes`、`/notes/[slug]`(每篇文章各一个静态页)、`/feed.xml` 均出现在产物里。
Run: `pnpm build:yueqiao`
Expected: 构建成功;`/notes` 不可达;`out/feed.xml`(如果产物结构是这样)内容不含 "The Sleep Lab"/"notes" 字样——`grep -l "Sleep Lab" out/feed.xml` 应无输出。

- [ ] **Step 3: 故意写坏一个字段,验证构建报错并指明文件(完成标准的直接证据)**

先记下要改的文件路径(IR-001 的文件,Task 11 创建):

```bash
IR_FILE=$(grep -rl "^ir: 1$" content/notes/*/index.md)
echo "$IR_FILE"
```

用 `Edit` 工具把这个文件里的 `ir: 1` 改成 `ir: "one"`(破坏类型:schema 要求 `z.number().int().positive()`),然后:

```bash
pnpm build:willsleep
```

Expected: 构建**失败**,错误输出里包含 `$IR_FILE` 的路径与 `ir` 字段名(来自 `getNotes()` 里 `throw new Error(...)` 拼出的错误信息)。把这段失败输出记录下来(截图或复制文本),作为完成标准"故意写坏一个字段,构建应报错并指明文件"的证据。

然后**撤销这处破坏性编辑**(用 `Edit` 工具把 `ir: "one"` 改回 `ir: 1`,不要用 `git checkout` 之类的命令——如果这一步之前还有其他未提交改动,`git checkout` 会连带撤掉那些),再跑一遍确认恢复正常:

```bash
pnpm build:willsleep
```

Expected: 构建成功。

- [ ] **Step 4: `git status` 收尾检查**

Run: `git status`
Expected: 干净(无残留的 Task 6 smoke-test 临时文件夹、无 Step 3 遗留的破坏性编辑)。

---

## 收尾说明

本计划完成后,`/notes` 档案室从内容管线到页面到 RSS 全部实现并已本机验证,`lib/rooms.ts` 的 `notes.open` 已经是 `true`(与 `/photos`/`/reel` 现状不同——那两个房间的管线交付时内容还没就绪,`/notes` 这次因为完成标准本身要求首发内容,所以管线和内容是一起交付的)。

按开工 prompt 的既定顺序,本计划执行完后依次调用:`superpowers:requesting-code-review`(有意见的话用 `superpowers:receiving-code-review` 甄别处理,不要不假思索照做)→ `superpowers:verification-before-completion`(真的跑一遍 Task 13 的全部命令并确认通过,沙盒跑不了的部分明确告知用户)→ `superpowers:finishing-a-development-branch`(决定怎么合并回 main,不要自己 push)。
