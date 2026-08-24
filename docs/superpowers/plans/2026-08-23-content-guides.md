# content-guides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `docs/content-guides/`, six internal-reference Markdown files (one per room: now/about/lab/photos/reel/notes) documenting how to write content for each room — frontmatter fields, a real example, and room-specific gotchas.

**Architecture:** Pure documentation. No app code, no routes, no dependencies change. Each file is self-contained and independently committable. Field data is transcribed from the current `lib/content.ts` / `lib/content-schema.ts` implementations and verified against them at write time (not from memory).

**Tech Stack:** Markdown only.

## Global Constraints

- Docs live under `docs/content-guides/`, not under `app/` — never wired into any route (spec: internal reference only, per user confirmation).
- Prose is in Chinese, matching the existing tone of `lib/content.ts` comments and `docs/superpowers/specs/*.md` (per user confirmation).
- No `.ts`/`.tsx` file is modified, no dependency is added, no route is added.
- Every non-placeholder file's example is either transcribed verbatim from a real content file in this repo, or (for `photos`/`reel`, which have no committed `index.md` yet) explicitly labeled "反推示例,未实跑" (reverse-derived from schema, not exercised).
- `notes.md` is a placeholder only — no schema/reader exists yet for that room.

---

### Task 1: `docs/content-guides/now.md`

**Files:**
- Create: `docs/content-guides/now.md`

**Interfaces:**
- Consumes: field behavior from `lib/content.ts:81-93` (`getNow`), rendering from `app/now/page.tsx:13-59`, real content from `content/now/index.md`
- Produces: `docs/content-guides/now.md` (standalone; no other task depends on it)

- [ ] **Step 1: Write the file**

Create `docs/content-guides/now.md` with exactly this content:

```markdown
# now 内容怎么写

## 文件位置
`content/now/index.md`(单文件,没有子目录)。

## frontmatter 字段
| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `title` | string | 否 | **解析但未使用**——`getNow()` 不读这个字段,页面标题写死在 `app/now/page.tsx`。留着只是约定,删掉也不影响渲染。 |
| `updated` | date | 否 | 渲染成页面顶部 "last updated: YYYY-MM-DD" 读数。留空则整行不渲染。 |
| `tinkering` | string[] | 否 | "在折腾"小节的条目列表。 |
| `reading` | string[] | 否 | "在读"小节。 |
| `thinking` | string[] | 否 | "在想"小节。 |
| `listening` | string[] | 否 | "在听"小节。 |

四个小节(`tinkering`/`reading`/`thinking`/`listening`)的显示顺序固定(代码里
`NOW_SECTIONS` 数组决定),不是 frontmatter 书写顺序。**任意小节留空或不写,整段
直接不渲染**——不会出现空标题(红线 3:没得写就删掉整段,不留占位)。

frontmatter 下面不加 `---` 包裹的普通文本会被当作页面底部的自由段落,按空行切分,
原样输出——不编译 markdown 语法,`#`/`*` 等符号会原样显示在页面上。

## 示例
摘自仓库现有的 `content/now/index.md`:

```yaml
---
title: now
updated: 2026-07-29

tinkering:
  - 在给这栋楼装门。走廊先亮的灯,房间一间间接电。
  - 把设计决定全写进 docs/ 再动手——没写进文档的决定不算数。

reading:
  - 卡夫卡《城堡》。每年重读一次,每年觉得 K. 又更像自己了一点。

thinking:
  - 一个人的站点该不该有"作息"。白天真的把灯调暗,是诚实还是做作?
  - 仪表读数到底算内容还是算装饰。分不清的时候,先按仪器对待。

listening:
  - 棕噪声,60Hz 低通。像空调,但空调不会在四点停。
---
```

## 坑
- 解析是 `lib/content.ts` 里手写的**宽容**逻辑,不是 zod schema:字段类型不对(比如
  `tinkering` 写成字符串而不是数组)会被静默当成空,不报错、不 build 失败,只是那个
  小节不显示。改完要自己肉眼确认页面,不能靠报错发现拼写问题。
- `content/now/index.md` 整个文件不存在时,`/now` 直接 404。

## 上线
`now` 房间目前已经 `open: true`(`lib/rooms.ts`),不需要额外操作。
```

- [ ] **Step 2: Verify field names against source**

Run: `grep -n "d\[id\]\|NOW_SECTIONS\|unit.data.updated\|toISODate\|toStringList" lib/content.ts | sed -n '1,15p'`

Confirm the four section ids (`tinkering`, `reading`, `thinking`, `listening`) and the
`updated` field appear exactly as written in the table above — no field renamed or
added since this plan was written. If they differ, update Step 1's content to match
current source before committing.

- [ ] **Step 3: Commit**

```bash
git add docs/content-guides/now.md
git commit -m "$(cat <<'EOF'
docs(content-guides): add now.md

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `docs/content-guides/about.md`

**Files:**
- Create: `docs/content-guides/about.md`

**Interfaces:**
- Consumes: field behavior from `lib/content.ts:97-202` (`getAbout`, `toObservers`, `toShelfItems`), rendering from `app/about/page.tsx`, real content from `content/about/index.md`
- Produces: `docs/content-guides/about.md` (standalone)

- [ ] **Step 1: Write the file**

Create `docs/content-guides/about.md` with exactly this content:

```markdown
# about 内容怎么写

## 文件位置
`content/about/index.md`(单文件)。

## PII 红线
这是全站唯一直接谈论"作者本人"的房间。任何一行都**不得**出现真实姓名、公司、学校、
精确地理位置。素材必须先过脱敏(参见 `docs/ABOUT-DESIGN.md` 附录 C/D 的候选池约定),
原始未脱敏文本不进 `content/`。

## frontmatter 字段
| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `title` | string | 否 | **解析但未渲染**——`getAbout()` 会读并默认成 `"the resident researcher"`,但 `app/about/page.tsx` 目前没有任何地方输出 `about.title`。 |
| `placard` | string | 是(空字符串会渲染成空) | ① 展牌文字,≤60 字,第三人称,手电筒效果的第一束光。 |
| `epigraph` | string | 否 | ③ 观察记录区上方的引言。留空则不渲染该行。 |
| `observers` | array | 否 | ③ 观察记录列表,见下方子字段。空数组则整段观察记录(含 `epigraph`/`curator_note`)都不渲染。 |
| `observers[].id` | number | 否(默认 `0`) | 观察者编号,纯展示用,不做唯一性校验,可重复。 |
| `observers[].date` | date | 否 | 该条观察记录的日期。 |
| `observers[].grade` | string | 否(默认 `""`) | 证据等级,如"观察"/"推断"/"猜测",mono 字体渲染。 |
| `observers[].quote` | string | **是**(缺了这条整条 observer 被丢弃) | 观察原文。 |
| `observers[].note` | string | 否 | 本人批注(幽默出口),不写就不显示这行。 |
| `curator_note` | string | 否 | 策展人注记,渲染在观察记录列表之后。注意 frontmatter 里是下划线 `curator_note`,不是 `curatorNote`。 |
| `naming` | array of `{quote, grade}` | 否 | ④ 命名注释列表。`quote`/`grade` 都非 string 时该条被跳过,不抛错。 |
| `naming_note` | string | 否 | 命名区下方的补充说明。frontmatter 字段名同样是下划线。 |
| `portrait` | string | 否 | ② 自画像,静态 ASCII/文本印版,原样渲染(会去掉结尾空白)。留空(`""`)则整段不显示——不放占位图。 |
| `portrait_alt` | string | 否 | `portrait` 的无障碍替代文本,`sr-only` 渲染。 |
| `shelves.books` / `.films` / `.music` / `.gear` | array of `{title, note?, href?}` | 否 | ⑤ 收藏架四层,固定这四个 key。某一层为空数组或不写,那一层不渲染;`title` 缺失的条目被跳过。 |

## 示例
摘自仓库现有的 `content/about/index.md`(节选,省略了部分 `observers` 条目):

```yaml
---
title: the resident researcher

placard: >-
  本馆唯一常驻研究员。白天修理机器,入夜研究睡眠。
  展出记录显示,其本人长期缺席该项研究的实践环节。

portrait: ""
portrait_alt: ""

epigraph: 每位观察者只见过ta的一个房间。

observers:
  - id: 2
    date: 2026-07-03
    grade: 观察
    quote: 晚九点到凌晨三点集中了ta三分之二的提交;凌晨四点到中午,一次都没有。这不是偶尔熬夜,是稳定制度。
  - id: 0
    date: 2026-07-03
    grade: 推断
    quote: ta用"文档定稿"给自己发通行证:没写进文档的决定,对ta不算数。
    note: 无可奉告。

curator_note: >-
  策展人注:两名从未见过面的观察者,在完全不同的领域撞到了同一堵墙:
  文字不许夸大一行,照片不许替换一张脸。本馆将此现象归档为:不许假。
---
```

`naming` / `shelves` 字段结构完整示例可直接参考仓库里 `content/about/index.md` 全文
(本文件只摘录了前半部分)。

## 坑
- 同 `now`:解析是 `lib/content.ts` 手写的**宽容**逻辑,类型不对会被静默丢弃(比如
  `observers` 某条缺 `quote` 会整条消失),不会 build 报错。
- frontmatter 字段名里 `curator_note`/`naming_note`/`portrait_alt` 是下划线命名,读到
  TS 类型里才变成 `curatorNote`/`namingNote`/`portraitAlt` 驼峰——写 frontmatter 时
  用下划线,别按 TS 类型名手滑写成驼峰(手滑了会被静默忽略,字段就是 `undefined`)。
- `content/about/index.md` 不存在时,`/about` 直接 404。

## 上线
`about` 房间目前已经 `open: true`(`lib/rooms.ts`),不需要额外操作。
```

- [ ] **Step 2: Verify field names against source**

Run: `grep -n "d\.title\|d\.placard\|d\.epigraph\|curator_note\|naming_note\|d\.portrait\|SHELF_IDS" lib/content.ts`

Confirm every field name in the table (especially the underscore-named ones:
`curator_note`, `naming_note`, `portrait_alt`) matches current source exactly. If
`getAbout()` has changed field names since this plan was written, update Step 1's
content before committing.

- [ ] **Step 3: Commit**

```bash
git add docs/content-guides/about.md
git commit -m "$(cat <<'EOF'
docs(content-guides): add about.md

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `docs/content-guides/lab.md`

**Files:**
- Create: `docs/content-guides/lab.md`

**Interfaces:**
- Consumes: field behavior from `lib/content.ts:208-259` (`toLabExperiment`, `getLabExperiments`, `getLabExperiment`), real content from `content/lab/001-breathing-field/index.md`
- Produces: `docs/content-guides/lab.md` (standalone)

- [ ] **Step 1: Write the file**

Create `docs/content-guides/lab.md` with exactly this content:

```markdown
# lab 内容怎么写

## 文件位置
`content/lab/<slug>/index.md` —— 每个实验一个目录,目录名就是 URL slug
(如 `content/lab/001-breathing-field/` 对应 `/lab/001-breathing-field`)。
`getLabExperiments()` 会读 `content/lab/` 下所有目录,按目录名排序列出。

## frontmatter 字段
| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `exp` | string | 否(默认 `""`) | 展示用编号,如 `"001"`。跟 slug 里的编号是两回事,可以不一致(但通常应该一致)。 |
| `title` | string | **是** | 实验标题。缺失或不是 string:**整个实验被静默跳过**,不出现在列表里,也不报错。 |
| `question` | string | **是** | 实验要回答的问题。缺失同 `title`:整个实验被跳过。 |
| `status` | `"ongoing"` \| `"archived"` | 否(默认 `"ongoing"`) | 只有精确等于字符串 `"archived"` 才算归档,其他任何值(包括拼错)都会被当成 `"ongoing"`。 |
| `method` | string | 否(默认 `""`) | 方法说明段落。 |
| `observation` | string | 否(默认 `""`) | 观察记录段落。 |
| `instruments` | string[] | 否(默认 `[]`) | 使用的"仪器"/技术清单。 |
| `poster` | string | 否 | 海报图路径,指向 `public/lab/` 下的静态文件(如 `/lab/001-breathing-field.svg`),`<img src>` 直接渲染,**不走 R2**、零管线。 |

`slug` 本身不是 frontmatter 字段——它就是目录名,代码直接用 `fs.readdirSync` 读出来。

## 示例
摘自仓库现有的 `content/lab/001-breathing-field/index.md`:

```yaml
---
exp: "001"
title: breathing field
question: can a screen pace your breathing down to sleep?
status: ongoing
poster: /lab/001-breathing-field.svg
method: >-
  整片波场的亮度与振幅挂在同一个 4-7-8 时钟上:吸气 4s 升起,屏息 7s 悬停,
  呼气 8s 沉降。基线亮度每完成一个周期递减一档,仪器沿会话缓慢熄向黑。
  声音(可选)与波场同一时钟:吸气渐强、呼气渐弱。
observation: >-
  闭眼也能跟——亮度透过眼睑可见,声音可关。基线递减让"跟到后面越来越暗"
  成为熄向睡眠的物理隐喻。遗忘不发声,这里也不需要。
instruments:
  - simplex-noise(波场)
  - Web Audio(可选呼吸音,lib/audio.ts)
  - canvas 2d
---
```

## 坑
- `title`/`question` 缺一不可:少写任何一个,那个实验会从 `/lab` 列表和详情路由里
  **完全消失**,没有任何报错提示——加完新实验一定要自己去 `/lab` 页面肉眼确认它出现
  了,不能只看 build 有没有报错。
- `status` 拼错(比如写成 `"Archived"` 大写、或 `"done"`)不会报错,会静默按
  `"ongoing"` 处理——归档状态没生效但你不会收到任何提示。
- `poster` 走的是 `/lab` 房间已验证过的静态文件模式(同 `reel` 的 `sleeve`),不是
  `photos` 的 R2 管线;图放进 `public/lab/`,frontmatter 写根相对路径字符串即可。
- 目录存在但没有 `index.md`,或 `index.md` 读取失败:该实验直接不出现在列表里,同
  样不报错。

## 上线
`lab` 房间目前已经 `open: true`(`lib/rooms.ts`)。新增实验目录后,只要
`title`/`question` 都写了,重新 build/dev 就会自动出现在 `/lab` 列表——不需要碰
`lib/rooms.ts`(那个开关是整个房间级别的,不是单个实验级别的)。
```

- [ ] **Step 2: Verify field names against source**

Run: `grep -n "data\.title\|data\.question\|data\.exp\|data\.status\|data\.method\|data\.observation\|data\.instruments\|data\.poster" lib/content.ts`

Confirm every field name and default value in the table matches
`toLabExperiment()` exactly. If the function's field names or defaults have
changed since this plan was written, update Step 1's content before committing.

- [ ] **Step 3: Commit**

```bash
git add docs/content-guides/lab.md
git commit -m "$(cat <<'EOF'
docs(content-guides): add lab.md

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `docs/content-guides/photos.md`

**Files:**
- Create: `docs/content-guides/photos.md`

**Interfaces:**
- Consumes: `lib/content-schema.ts:8-23` (`photoSetSchema`), `lib/content.ts:531-595` (`getPhotoRolls`), `scripts/sync-images.mjs` (full pipeline), `content/image-manifest.json` (real manifest entry for `imp` roll)
- Produces: `docs/content-guides/photos.md` (standalone)

- [ ] **Step 1: Write the file**

Create `docs/content-guides/photos.md` with exactly this content:

```markdown
# photos 内容怎么写

跟其他房间不一样,`photos` 不是"写个 frontmatter 就完事"——它有一条完整的图片处理
管线。原图不进 git(体积大),真正被页面读取的是同步脚本生成的
`content/image-manifest.json` + R2 上的四档尺寸文件。

## 文件位置
- `content/photos/<roll>/` —— 每个 roll(一组照片)一个目录,目录名是 roll 的 slug。
- `content/photos/<roll>/index.md` —— **可选**的 roll 元数据(标题/日期/图片顺序)。
  没有这个文件也能显示:roll 标题退化成目录名,图片按文件名字典序排列。
- 该目录下的图片文件本身(`.jpg`/`.jpeg`/`.png`/`.webp`/`.heic`)。
- `content/image-manifest.json` —— **机器生成的产物**,由 `npm run sync:images` 写入,
  不要手动编辑。

## index.md frontmatter 字段(可选文件)
校验走 `lib/content-schema.ts` 的 `photoSetSchema`(zod)。**校验失败会直接抛错、
build 失败**——跟 `now`/`about`/`lab` 的宽容解析不同。

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `title` | string | 否 | roll 标题。不写则用目录名。 |
| `date` | date | 否 | roll 日期,决定在 `/photos` 页面里的排序(有日期的降序在前,没日期的按 slug 字典序排在后面)。 |
| `photos` | array of `{file, caption?}` | 否 | 指定图片显示顺序和说明文字。`file` 必须匹配 `\.(jpe?g|png|webp|heic)$`(大小写不敏感)。列在这里的文件排在前面,目录里其余没登记的图片文件按字典序追加在后。 |

## 示例(反推示例,未实跑)
仓库里现有的 `content/photos/imp/` 只有一张图片、没有 `index.md`,所以下面这份
`index.md` 是根据 schema 反推的最小合法样例,不是从仓库摘的真实文件:

```yaml
---
title: imp
date: 2024-07-16
photos:
  - file: IMG_1940.png
    caption: 第一张
---
```

## 同步管线(把图片从本地弄到线上)
1. 把原图放进 `content/photos/<roll>/`(直接文件,不用先建 `index.md`)。
2. 配置好这五个环境变量(`.env.local`,`npm run sync:images` 会自动加载):
   `R2_ACCOUNT_ID`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`、`R2_BUCKET`、
   `R2_PUBLIC_BASE_URL`。
3. 跑 `npm run sync:images`(想先看看会发生什么、不真的上传,加 `--dry-run`;
   也可以只同步某个 roll:`npm run sync:images -- <roll-name>`)。
4. 脚本做的事:检查 iCloud 文件是否已下载到本地(dataless 会等待物化,超时
   ——默认 15s,`SYNC_ICLOUD_TIMEOUT_MS` 可调——就跳过该文件并打印警告)→ 用
   sharp 生成 480/960/1600/2400 四档 webp → 算 blurhash 占位图 → 提取 EXIF →
   按内容哈希幂等上传到 R2(已存在的 key 直接跳过,不重复上传)→ 把结果写进
   `content/image-manifest.json`。
5. 提交 `content/image-manifest.json` 的改动(它是仓库跟踪的产物,图片二进制本身
   不进 git)。

## 坑
- `index.md` 里的 frontmatter 校验失败(比如 `file` 不是图片扩展名)会让**整个
  build 失败**,不是静默丢弃——这是故意的,单作者站点提前发现拼写错误好过悄悄丢内容。
- 没有 `R2_*` 环境变量时,`npm run sync:images`(非 `--dry-run`)会直接报错退出,
  不写 manifest、不产生任何副作用;想先验证管线跑不跑得通,用 `--dry-run`。
- iCloud 文件如果处于"dataless"(离线)状态,`brctl download` 对孤立文件可能不生效
  ——真正兜底的是超时后跳过该文件,不是这次调用本身生效。见 memory
  `icloud-drive-build-hazard`:开发机重装 node_modules/清缓存后,iCloud 文件可能被
  连带驱逐。
- `getPhotoRolls()` 返回空数组(比如 `content/photos/` 目录整个不存在)时,
  `/photos` 直接 404。

## 上线
`photos` 房间目前是 `open: false`(`lib/rooms.ts`,第 4 期)。就算内容和图片管线都
跑通了,走廊门牌**不会自动打开**——`open` 翻不翻真是单独的、人工做的决定,不是内容
上线的自动结果。
```

- [ ] **Step 2: Verify against source**

Run: `grep -n "title:\|date:\|photos:\|file:\|caption:" lib/content-schema.ts | head -10`

Confirm `photoSetSchema`'s three top-level fields (`title`, `date`, `photos`) and the
`photos[]` sub-fields (`file`, `caption`) match the table above.

Run: `grep -n "R2_ACCOUNT_ID\|R2_ACCESS_KEY_ID\|R2_SECRET_ACCESS_KEY\|R2_BUCKET\|R2_PUBLIC_BASE_URL" scripts/sync-images/r2-upload.mjs`

Confirm all five env var names match. If either check shows a mismatch (schema
fields renamed, env var names changed), update Step 1's content before committing.

- [ ] **Step 3: Commit**

```bash
git add docs/content-guides/photos.md
git commit -m "$(cat <<'EOF'
docs(content-guides): add photos.md

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `docs/content-guides/reel.md`

**Files:**
- Create: `docs/content-guides/reel.md`

**Interfaces:**
- Consumes: `lib/content-schema.ts:32-65` (`reelFavoriteSchema`, `reelLogEntrySchema`, `reelSchema`), `lib/content.ts:288-317` (`getReel`), `app/reel/page.tsx:24-27` (404 condition), `docs/superpowers/specs/2026-08-21-reel-room-design.md` (sleeve convention)
- Produces: `docs/content-guides/reel.md` (standalone)

- [ ] **Step 1: Write the file**

Create `docs/content-guides/reel.md` with exactly this content:

```markdown
# reel 内容怎么写

## 文件位置
`content/reel/index.md`(单文件;这个文件和目录在仓库里目前还不存在——`reel` 房间
是 `open: false`,还没有真实内容)。

## frontmatter 字段
校验走 `lib/content-schema.ts` 的 `reelSchema`(zod)。**校验失败会直接抛错、build
失败**——跟 `now`/`about`/`lab` 的宽容解析不同,跟 `photos` 一样严格。

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `favorites` | array | 否 | 策展式精选,**不按时间排序**,保留 frontmatter 里写的原始顺序。 |
| `favorites[].title` | string | **是** | 精选条目标题。 |
| `favorites[].note` | string | 否 | 说明文字。 |
| `favorites[].sleeve` | string | 否 | 封面图路径,必须匹配 `^/reel/.+\.(jpe?g|png|webp|svg)$`——即以 `/reel/` 开头。指向 `public/reel/` 下的静态文件,**不走 R2**、零管线。加载失败或缺失时优雅降级成纯文字卡,不留破图占位。 |
| `favorites[].href` | string | 否 | 外链,必须匹配 `^https?://`(http/https 开头)。 |
| `log` | array | 否 | 时间序日志,**按 `date` 降序排序**(最新在前)——spec 明确拒绝"置顶"这个概念,所以没有额外的排序字段。 |
| `log[].date` | date | **是** | 日志日期。 |
| `log[].text` | string | **是** | 日志正文。 |
| `log[].ref` | string | 否 | 可选的站内链接,必须以单个 `/` 开头(不能是 `//` 开头的协议相对地址)。 |

`favorites` 和 `log` 都可以省略或写成空数组——**但两者都为空时,`/reel` 直接
404**(这个判断在 `app/reel/page.tsx` 里,不是 schema 的职责)。

## 示例(反推示例,未实跑)
仓库里目前没有真实的 `content/reel/index.md`,下面这份是根据 `reelSchema` 反推的
最小合法样例:

```yaml
---
favorites:
  - title: Nocturne
    note: 睡不着的时候听的第一张
    sleeve: /reel/nocturne.jpg
    href: https://example.com/nocturne
  - title: 无封面的例子
    note: sleeve 和 href 都可以不写,降级成纯文字卡

log:
  - date: 2026-08-20
    text: 重新翻出这张,发现比记忆里好听
    ref: /lab/001-breathing-field
  - date: 2026-08-15
    text: 一条没有 ref 的日志也合法
---
```

## 坑
- frontmatter 不合法(比如 `sleeve` 不是 `/reel/` 开头、`href` 不是 `http(s)://`
  开头、`log[].date` 缺失)会让**整个 build 失败**,不是静默丢弃。
- `sleeve` 的封面图放 `public/reel/`,是普通静态文件——不要以为跟 `photos` 一样要
  过 R2 同步脚本,这里完全不需要那条管线(体积小、数量少、经过挑选,直接照搬 `lab`
  的 `poster` 字段模式)。
- `log` 是严格按 `date` 排序的时间序,frontmatter 里写的顺序不影响最终显示顺序;
  `favorites` 相反,是策展式的,顺序就是你写的顺序,不会被自动排序。
- `sleeve` 图片必填 `alt`(在渲染层要求,不是 frontmatter 字段本身)——空字符串也算
  显式声明,不是漏填。

## 上线
`reel` 房间目前是 `open: false`(`lib/rooms.ts`,"待定期")。内容写完、能通过 build
之后,走廊门牌**不会自动打开**——`open` 翻不翻真是单独的、人工做的决定。
```

- [ ] **Step 2: Verify against source**

Run: `grep -n "title:\|note:\|sleeve:\|href:\|date:\|text:\|ref:\|regex" lib/content-schema.ts | sed -n '1,20p'`

Confirm every field name and every regex constraint (`sleeve` prefix, `href`
protocol, `ref` leading-slash rule) in the table matches `reelFavoriteSchema` /
`reelLogEntrySchema` exactly.

Run: `grep -n "favorites.length === 0 && reel.log.length === 0" app/reel/page.tsx`

Confirm the both-empty-404 condition still exists as described. If any mismatch,
update Step 1's content before committing.

- [ ] **Step 3: Commit**

```bash
git add docs/content-guides/reel.md
git commit -m "$(cat <<'EOF'
docs(content-guides): add reel.md

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: `docs/content-guides/notes.md`

**Files:**
- Create: `docs/content-guides/notes.md`

**Interfaces:**
- Consumes: absence check against `lib/content.ts` (no `getNotes`), `lib/rooms.ts:16` (`notes` room registration, `open: false`, "第 3 期")
- Produces: `docs/content-guides/notes.md` (standalone)

- [ ] **Step 1: Write the file**

Create `docs/content-guides/notes.md` with exactly this content:

```markdown
# notes 内容怎么写

**还没法写。** `notes` 房间目前只在 `lib/rooms.ts` 里注册了 `RoomId` 和
`open: false`(标注"第 3 期"),但内容管道完全没实现:

- 没有 `lib/content.ts` 里的 `getNotes()` 之类的 reader 函数
- 没有 `lib/content-schema.ts` 里的 notes frontmatter schema
- 没有 `content/notes/` 目录
- 没有 `app/notes/page.tsx`

## 等真正实现的时候,参照哪个模式

`notes` 具体该长什么样(单文件还是按条目分目录、要不要配图)取决于第 3 期的实际设计,
但代码库里已经有两条验证过的模式可以参考,不用从零设计:

- **纯 frontmatter + 正文段落,像 `lab`**——如果 notes 是"一条一条独立记录,每条有
  标题/日期/正文",可以照抄 `content/lab/<slug>/index.md` 那种"目录名即 slug、
  frontmatter 存结构化字段、正文自由段落"的布局(参见 `docs/content-guides/lab.md`)。
- **带资源同步管线,像 `photos`**——如果 notes 要挂配图,`DESIGN.md` §6 的图片同步
  流程图已经把 notes 插图画了进去(`scripts/sync-images.mjs` 目前只扫
  `content/photos/**`,接入 notes 时预期只是加一行 glob,不是重新设计整条管线,见
  `docs/superpowers/specs/2026-08-21-photos-darkroom-design.md`"不做"清单)。

实现的时候,应该先走 `superpowers:brainstorming` 出一份设计(参照
`docs/superpowers/specs/2026-08-21-photos-darkroom-design.md`、
`docs/superpowers/specs/2026-08-21-reel-room-design.md` 的格式),再回来把这份文件
换成真正的字段表 + 示例——不要在没有设计文档的情况下直接抄 lab/photos 的代码结构。

## 上线
等内容管道实现、`content/notes/` 有真实内容之后,去 `lib/rooms.ts` 把 `notes` 的
`open` 改成 `true`。
```

- [ ] **Step 2: Verify the absence claims are still accurate**

Run: `grep -n "getNotes" lib/content.ts lib/content-schema.ts; ls content/notes 2>&1; ls app/notes 2>&1`

Expected: no matches for `getNotes`, and both `ls` commands report "No such file or
directory". If any of these now exist (notes room got implemented since this plan
was written), stop — this task is obsolete, go write the real `notes.md` using the
same template as Tasks 1-5 instead of the placeholder above.

- [ ] **Step 3: Commit**

```bash
git add docs/content-guides/notes.md
git commit -m "$(cat <<'EOF'
docs(content-guides): add notes.md placeholder

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
