# /notes 档案室 — 设计文稿
> 2026-08-25 · willsleep.dev (myHomePage)

## 0. 上位规格与定位

上位规格:[DESIGN.md](../../DESIGN.md) §4(内容库约定)、§5 /notes 一节。冲突时以上位规格为准。

**排期已确认:** DESIGN.md §9(2026-08-22 修订)把 /photos(期 3)排在 /notes(期 4)之前。/photos 的管线与页面(PR #3)已于 2026-08-23 合并进 main——本文档开工前已核实这一点(`gh pr view 3` 返回 `state: MERGED`)。docs/BUILD-LOG.md 当时把这一格标记为待合并(⬜),是文档没跟上实际合并状态,与本次开工无关,顺手在本次的文档同步里一并订正(见 §13)。

这是"内容库解析管线"整体拼图的最后一大块:`lib/content-schema.ts`(第 3 期已建立文件,只有 `photoSetSchema`/`reelSchema` 两个 schema)与 `scripts/new-content.mjs`(此前完全不存在)本次一起补齐。

## 1. 切片范围

**做:**

- `lib/content-schema.ts`:新增 `noteRecordSchema`(`noteSchema`/`dreamSchema`/`incidentSchema` 三个子 schema 的 discriminated union,判别字段 `type`)
- `lib/content.ts`:新增 `getNotes()` / `getNote(slug)`,复用 `readUnit()` 的既有读取模式;`RoomStatuses.notes` 从硬编码 `null` 接上真实值(`{ records, latestId }` 的形状已经写在 `lib/i18n/strings.ts` 的 `formatPeek()` 里,本次只是把生产者接上)
- markdown 编译管线:新增 `unified`/`remark-parse`/`remark-rehype`/`rehype-stringify`/`remark-gfm` 依赖,替换 notes 正文的处理(`now`/`about`/`lab` 现有的 `toParagraphs()` 简单分段法保留不动,只服务于它们自己)
- 插图管线:构建期把 `content/notes/<slug>/*.{jpg,png,webp}` 拷贝到 `public/notes/<slug>/`,remark 插件把正文相对引用改写成对应根路径
- `scripts/new-content.mjs`:交互式脚手架,支持 `new:note` / `new:dream` / `new:incident` / `new:roll` 四个 `package.json` 脚本(`new:roll` 服务 /photos,是第 3 期遗留给本期的活,DESIGN §4 明文写着"脚手架与校验第 4 期随解析管线一起交付")
- `app/notes/page.tsx`(列表)、`app/notes/[slug]/page.tsx`(文章页)
- `app/feed.xml/route.ts`:静态 `GET`,三种类型全收,只收 canonical
- `lib/rooms.ts`:`notes` 的 `open` 翻真(内容就绪后)
- `lib/i18n/strings.ts`:追加 `notes.*` 文案键(dream/incident 读数行的字段标签等)
- 走廊集成:`RoomStatuses.notes` 接上真实数据后,门缝读数自动生效(`formatPeek()` 的 `notes` 分支已存在,无需改)
- 首发内容:脚手架创建并发布第一篇 note、REM-001、IR-001(§11)

**不做:**

- zh/en 翻译文件(`index.zh.md` / `index.en.md`)——那是第 5 期的范围(DESIGN §7),本期只保证 canonical 单版本可用,`lang` 字段写入但不消费
- REM observatory(/lab 候补方向,DESIGN §5 /lab)——notes 攒够梦境记录后才有意义,不是本期产出
- `getLatestEntry()` 全站"最新记录"联动——与 /reel 规格文档同一处待定,不该被本次房间切片顺手带过,继续留空(返回 `null`)
- 任何新签名效果——DESIGN §10.1 账本已经登记 /notes 为"无",阅读优先纯排版,这是既有决定不是本次重开

**完成标准(逐条对齐 DESIGN §9 期 4 与用户开工 prompt):**

- 发布第一篇 note、第一条 REM、第一份 IR,三者均由脚手架创建(不手写)
- 故意写坏一个字段,`next build` / `tsc` 报错且指明文件与字段(zod 校验生效的可验证证据)
- `app/feed.xml` 可订阅,三种类型都在
- `npx tsc --noEmit` 通过

## 2. 内容类型与 schema

三种类型共享的基础字段(对齐 DESIGN §5 的 frontmatter 示例):

```yaml
title: string          # 必填
date: date              # 必填,ISO 日期
type: note | dream | incident   # 必填,discriminator
summary: string          # 必填,列表页摘要 + RSS description
lang: mixed | zh | en    # 可选,默认 mixed
```

**note:** 无额外字段,只有基础字段。

**dream:**

```yaml
rem: number       # 必填,脚手架自动分配,不接受手填(schema 只做类型/正整数校验,不校验"是否连续"——
                   # 连续性由脚手架的分配逻辑保证,schema 不是编号分配的权威来源,见 §3)
recorded: datetime # 可选,晨间记录时刻
lucidity: number    # 可选,1-5
```

**incident:**

```yaml
ir: number                          # 必填,同 rem 的分配方式
severity: number                     # 可选,1-3(SEV-1~3,数字越小越严重)
status: resolved | ongoing | wontfix  # 可选,默认 ongoing(刚脚手架出来的事故不可能已经 resolved)
```

`lib/content-schema.ts` 实现为:

```ts
const noteBaseSchema = z.object({
  title: z.string().trim().min(1),
  date: z.coerce.date(),
  summary: z.string().trim().min(1),
  lang: z.enum(["mixed", "zh", "en"]).default("mixed"),
});

export const noteSchema = noteBaseSchema.extend({ type: z.literal("note") });
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
```

`getNotes()` 的校验失败处理与 `photoSetSchema`/`reelSchema` 现状同构:`safeParse` 失败直接 `throw`,错误信息带文件路径 + zod issue 列表——这就是完成标准里"故意写坏一个字段,构建报错并指明文件"的实现来源,不需要额外写专门的错误格式化代码,复用已经在 `getReel()`/`getPhotoRolls()` 里验证过的模式。

## 3. REM / IR 编号分配

**规则:扫描现有内容取 `max + 1`,不设持久化计数器文件。**

理由:DESIGN §1 的档案纪律是"只追加,不重写",编号"永不复用"——已发布的记录不会被删除或重排,这意味着 `content/notes/**/index.md` 目录本身就是编号使用情况的唯一权威账本。额外维护一个计数器文件(如 `content/.counters.json`)只会引入第二份账本,一旦两者不同步(比如手动改过文件后忘记同步计数器),麻烦比它解决的问题更大。

**边界情况:** 这条规则依赖的真实不变量是"已提交/已发布的记录不会被删除",不是"任何文件都不会被删除"——脚手架生成后、提交前如果作者反悔删掉了一份草稿(比如生成了一份不想要的 REM 草稿,还没 `git add`),这份草稿从未成为过真正的记录,重新扫描拿到同一个号完全正确,不算"复用编号"。

实现(`scripts/new-content.mjs` 内部):

```
1. 扫描 content/notes/*/index.md
2. gray-matter 读 frontmatter,收集 type === 'dream' 的 rem 值 / type === 'incident' 的 ir 值
3. 下一个编号 = max(收集到的值, 0) + 1
4. 目录不存在(还没有任何 note)时,下一个编号从 1 开始
```

这一步只服务于脚手架生成新文件时"该填几号",不是运行时校验的一部分——schema 本身不检查"整个仓库范围内编号连续无重复",这是刻意的边界:防止未来某次手工调整（如 addendum 更正）意外触发一次全库扫描式的校验失败。

## 4. Markdown 编译与插图

**依赖:** `unified` + `remark-parse` + `remark-gfm` + `remark-rehype` + `rehype-stringify`(DESIGN §4 明文点名"unified/remark 编译 markdown")。四个包体积都很小,纯构建期使用,不影响客户端 bundle(notes 页面是 Server Component)。

**为什么不复用 `toParagraphs()`:** `now`/`about`/`lab` 的正文是短陈述句或结构化字段,`toParagraphs()` 按空行分段、原样输出就够。notes 是真正的长文章(Lora 正文,DESIGN §2/§5),需要标题、加粗、列表、链接这些真实 markdown 语法,继续用简单分段会让作者退化成"只能写纯文本段落",不满足"档案室收记录,不收阉割过的文本"的定位。

**插图落地(已与用户确认的方案):**

1. 正文里的相对引用保持 DESIGN §4 约定的写法:`![说明](./figure-1.jpg)`
2. 构建期(`getNotes()`/`getNote()` 读取阶段),扫描 `content/notes/<slug>/` 下除 `index.md` 外的图片文件,原样(不经 sharp、不生成多档尺寸、不查 EXIF——这是随笔插图不是照片瀑布流,§DESIGN 4 约定 3 的"图片与文字同居"是给所有内容类型的通用规则,但处理深度按房间性质分层)`fs.copyFileSync` 到 `public/notes/<slug>/`,幂等(目标已存在且内容哈希一致则跳过)
3. remark 插件(自定义,几行代码,不需要额外的 unified 插件包)把 AST 里 `image` 节点的相对 `url`(以 `./` 开头)重写为 `/notes/<slug>/<filename>`
4. 图片本身随 markdown 一起入库(git 策略同 DESIGN §4 约定 4:notes 的小插图入库,不是 gitignore),不经过 /photos 的 R2 管线——这条路径只服务 /photos(原图体积大、数量多、专门 gitignore),notes 插图体积小、数量少,不需要为它等 R2 配置就绪

## 5. 脚手架 `scripts/new-content.mjs`

CLI 风格延续 `scripts/sync-images.mjs`(Node ESM,无额外交互式提示库依赖,用 `node:readline/promises` 收集输入)。四个 `package.json` 脚本各自传一个 `--type` 参数进同一个入口文件:

```json
"new:note": "node scripts/new-content.mjs --type note",
"new:dream": "node scripts/new-content.mjs --type dream",
"new:incident": "node scripts/new-content.mjs --type incident",
"new:roll": "node scripts/new-content.mjs --type roll"
```

**共同前置校验:** 目标文件夹已存在时直接报错退出,不覆盖——档案是追加式的,脚手架不该有意外覆盖已发布记录的路径。

**`new:note`:**
1. 提问 `title`(必填,允许问句)
2. 提问 `summary`(必填——列表页与 RSS 都靠它)
3. slug = `<今日日期>-<title 转 slug>`,写 `content/notes/<slug>/index.md`,`type: note`、`date: 今日`、`lang: mixed`,正文留一行占位注释(脚手架不代笔正文,正文由使用者/后续 agent 另写)

**`new:dream`:**
1. 提问 `title`(可选,回车留空则用 `dream` 兜底——DESIGN §5 明确梦境"可短至三句、不成句",不该强制一个完整标题)
2. **自动分配下一个 REM 号**(§3),打印出来告知使用者
3. 提问 `recorded`(可选,回车则默认当前时刻的 ISO 字符串)
4. 提问 `lucidity`(可选,回车则不写该字段)
5. `summary` 与 note 一样必填(列表页需要它)
6. 写 `content/notes/<slug>/index.md`,`type: dream`、`date: 今日`、`rem: <分配到的号>`

**`new:incident`:**
1. 提问 `title`(必填)
2. **自动分配下一个 IR 号**,打印
3. 提问 `severity`(可选,1-3,回车不写)
4. `status` 不问,硬编码写入 `ongoing`(刚发生的事故不可能一创建就是 resolved 或 wontfix,这两个终态只应该由后续手工编辑 frontmatter 改写——档案纪律允许"结案"这个动作本身是一次追加式更正,不是脚手架该做的猜测)
5. 提问 `summary`
6. 写入文件(`type: incident`、`date: 今日`、`ir: <分配到的号>`),**正文自动生成三段骨架**(DESIGN §4 明文要求):
   ```markdown
   ## timeline


   ## root cause


   ## lessons

   ```

**`new:roll`(服务 /photos,本期补齐的脚手架缺口):**
1. 提问 `title`
2. slug = `<今日日期>-<title 转 slug>`,创建 `content/photos/<slug>/` 目录 + 最小 `index.md`(只有 `title`、`date`,不写 `photos:` 数组——用户之后把原图丢进这个目录,按字典序自动排入 roll,不需要在 frontmatter 里逐张登记)
3. 不涉及 REM/IR 编号,不生成正文骨架

## 6. 页面

**`/notes` 列表(`app/notes/page.tsx`):**

- Server Component,`getNotes()` 按年分组、组内按日期倒序
- 每行编目格式(DESIGN §5 逐字规格):
  - dream:`REM-{seq} · {date} · {title}`
  - incident 有 `severity`:`IR-{seq} · SEV-{severity} · {title}`;无 `severity`:`IR-{seq} · {status} · {title}`(技术判断:字段缺失时用 `status` 兜底占住"仪器读数"那个位置,而不是省掉整段变成两栏——保持视觉节律统一)
  - note:`{date} · {title}`,无前缀
- 两档灰阶规则原样照抄 DESIGN §5:编号/日期/SEV 是读数(`white/40`),标题是内容且是链接(`white/70`,hover 变白,整行可点)
- `getNotes()` 返回空数组 → `notFound()`,与 photos/reel 的"内容单元不存在"规则同构

**`/notes/[slug]` 文章页(`app/notes/[slug]/page.tsx`):**

- `generateStaticParams` 扫描所有 slug(与 `/lab/[slug]` 现有模式一致)
- Lora 正文,`max-w-prose`,markdown 编译产物(§4)
- dream/incident 顶部一行仪表读数(可选字段缺失则省略对应半句,不留空槽):
  - dream:`recorded: {recorded} · lucidity: {lucidity}/5`
  - incident:`severity: SEV-{severity} · status: {status}`
- 双站门控与既有房间同构:`!isWillsleep` 时 `notFound()`,`metadata` 双写

## 7. RSS(`app/feed.xml/route.ts`)

- 静态 `GET`(Next 16 静态导出对 Route Handler 的 GET 支持,DESIGN §5 已确认这个技术路径可行)
- 三种类型全部收录,条目标题按列表页同一套前缀规则(`REM-007 · 电梯只到 B2` 这类),`description` 取 `summary`
- 只有 canonical 一份(DESIGN §7.5),不等第 5 期的 zh/en 就能先上线,翻译版做出来后也不额外产出 feed

## 8. 走廊集成

- `lib/rooms.ts`:`{ id: "notes", href: "/notes", open: false }` 这一行的 `open` 在内容发布后翻 `true`(与 photos/reel 现状一致:先落地代码与内容,`open` 翻转是最后一步、独立的人工决定)
- `RoomStatuses.notes`:`getRoomStatuses()` 里 `notes: null` 改为真实计算:`getNotes()` 有记录时 `{ records: 总数, latestId: 最新一条的展示编号(REM-xxx/IR-xxx/或日期) }`
- `lib/i18n/strings.ts`:新增 `notes.record.recorded` / `notes.record.lucidity` / `notes.record.severity` / `notes.record.status` 这几个字段标签的三语 entry(仪表读数行需要,行为对齐现有 `lab.record.*` 系列的写法)

## 9. 视觉、间距与降级

- 无新签名效果(DESIGN §10.1 账本已登记 /notes 为"无",阅读优先纯排版)
- 间距沿用 §DESIGN 2 的 12 的倍数节律,正文块内部走 1.75 行高(§DESIGN 10.5 既有规则),不新开一档
- 列表页两档灰阶严格照抄 DESIGN §5 的管辖边界(§2 表格),不因为"这是新房间"就重新发明一套
- `prefers-reduced-motion`:本房间本来就没有动效,无需额外处理

## 10. 无障碍与降级

- 插图 `alt` 必填(markdown 语法 `![alt](src)` 天然要求这一位,空字符串也算显式声明)
- 双语门控:`yueqiao` 构建下 `/notes`、`/notes/[slug]`、`/feed.xml` 均需确认不泄露房间名——`/feed.xml` 这个路由比较特殊(它不是房间页面,是全站级文件),需要在实现时确认 `isWillsleep` 分支覆盖到它,否则 yueqiao 构建可能意外产出一份带 willsleep 内容的 feed
- 键盘导航:列表页整行可点,焦点态与现有房间列表(如 /lab 卡片)同构

## 11. 首发内容(完成标准的一部分,均由脚手架创建)

**note:** 主题是"造这套档案室系统本身的一点感想"——用户已确认这个方向,内容由本次实现顺带起草,发布后可随时按档案纪律用文末 `addendum:` 追加修正,不需要现在就写到"终稿"水准。

**REM-001:** 用户已确认用占位文字创建——标题写成问句式占位(不编造一个不存在的梦),正文留空/留一行"待补"说明,`recorded`/`lucidity` 留空。这不算违反"宁缺毋滥"或"不许假":占位状态本身被显式标注,不是伪装成真实记录。

**IR-001:** 用户已确认使用真实发生过的 iCloud Drive 构建挂死事故(2026-07-02):`node_modules` 被 iCloud 判定为可驱逐文件而清空,导致本地构建挂死在 0% CPU;`.env` 相关文件在同一次驱逐中被孤立。这个事故已经是仓库记忆(memory)里记录过的真实事件,DESIGN §5 举例时也提到了同类事故("node_modules 被 iCloud 蒸发事故")——实现时按 timeline/root cause/lessons 三段骨架把这次真实经过如实填入,不编造细节,细节不确定的地方标注"记忆不完整"而不是编。

## 12. 验收清单

- [ ] `npx tsc --noEmit` 通过
- [ ] `pnpm lint` 通过
- [ ] `pnpm build:willsleep` / `pnpm build:yueqiao` 均通过
- [ ] 故意在某个 note/dream/incident 的 frontmatter 里写坏一个字段(如把 `rem` 写成字符串),`next build` 报错且错误信息包含文件路径与字段名
- [ ] `content/notes/` 为空目录时,`/notes` 直链 404
- [ ] `/notes` 列表页三种类型的编目行格式与 DESIGN §5 示例逐字一致
- [ ] `/notes/[slug]` 正文渲染出真实 markdown(标题/加粗/链接至少一种在首发 note 里体现)
- [ ] `/feed.xml` 可访问,三种类型都在,`yueqiao` 构建下不泄露 willsleep 内容
- [ ] `new:note`/`new:dream`/`new:incident`/`new:roll` 四个脚手架各跑一次,生成的文件夹与 frontmatter 结构正确;对已存在的目标目录重跑时拒绝执行
- [ ] REM/IR 编号分配:连续跑两次 `new:dream`,第二次拿到的 `rem` 比第一次大 1
- [ ] 走廊门缝读数:`notes` 一栏在内容发布后正确显示 `{records} · latest {id}`
- [ ] 第一篇 note、REM-001、IR-001 均已发布,均可在 `git log` 里看到是脚手架生成后再编辑填充的(不是手写创建的新文件)

## 13. 文档同步记录

- `docs/BUILD-LOG.md`:订正期 2(/lab)、期 3(/photos)、"—"(/reel)三行的 merge 列——三者对应的 PR(#2/#3/#4)实际都已合并,文档此前仍标 🟡/⬜,与本次开工的实际状态核实结果不符,顺手修正(不属于本文档的设计决定,只是把已发生的事实记回文档)
- 完成实现后:`docs/DESIGN.md` §9 期 4 这一行的完成标准勾选情况、`docs/BUILD-LOG.md` 期 4 状态行的四格,按本文档 §12 验收清单实际跑通情况更新

---
