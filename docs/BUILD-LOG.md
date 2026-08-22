# Build Log

> willsleep.dev · 2026-08-22 起维护
> 记录分期实施的当前进度(spec → plan → build → merge 四步),以及每期的开工 prompt。
> 状态定义见 [DESIGN.md](DESIGN.md) §9(分期总表)与 §3/§10.1(`/reel` 等未编号房间的路由与签名账本)——DESIGN.md 负责"是什么/为什么",这份文件负责"现在走到哪一步 + 下一步怎么开工"。
> 可视化版本(同一批数据,styled off DESIGN.md 自己的视觉系统)有两份:仓库内 [BUILD-LOG.html](BUILD-LOG.html)(可直接双击在浏览器打开,不依赖任何链接)与托管的 [Sleep Lab Build Log](https://claude.ai/code/artifact/54f13327-e5f9-45c6-b8ab-4541ff31bc91)(Claude Artifact,私有链接,方便分享)。**这份 Markdown 才是可 diff、进仓库的数据源;两份 HTML 都只是它的展示层,不是另外的独立源** —— 三处更新时一起改,不然又要重演这次刚修完的 DESIGN.md §9 分叉。

## 怎么用这份文档

每期一行状态 + 一个可以直接粘给新 Claude 会话的开工 prompt。跑完一期后:

1. 把该期状态行的 `spec / plan / build / merge` 四格更新
2. spec / plan 文档落地后,把链接补进这份文件
3. 如果这次改动也影响了 DESIGN.md(路由表、签名账本、分期表),一并同步——两份文档不该再次分叉

## 现状总览(as of commit `a250c9e`,2026-08-22)

| 期 | 房间 | spec | plan | build | merge | 备注 |
|---|---|---|---|---|---|---|
| 1 | 骨架 | ✅ | ✅ | ✅ | ✅ | on main |
| 2 | /lab 实验区 | ✅ | ✅ | 🟡 | 🟡 | EXP-001 已合并;**期2 的完成标准写的是 EXP-001~003 三件都上**,EXP-002/003 已实现但未合并,严格说这期还没完全达标——见下一节 |
| — | infra · CI/CD 完善 | ✅ | ✅ | ✅ | ✅ | 直接在 main 上做的,没走 worktree |
| 3 | /photos 暗房 | ⬜ | ⬜ | ⬜ | ⬜ | 下一个该开工的 |
| — | /reel 卷带间 | ✅ | ⬜ | ⬜ | ⬜ | spec 已提交(`04c8096`);两处判断待确认,见下 |
| 4 | /notes 档案室 | ⬜ | ⬜ | ⬜ | ⬜ | 排在 /photos 之后(round #4 决定) |
| 5 | /zh /en 翻译版 | ⬜ | ⬜ | ⬜ | ⬜ | 建议其他房间稳定后再做 |

独立并行、不占以上任何一期:`/about` 收藏架的音乐 shelf 待填真实曲目——纯内容型任务,不需要开工 prompt,等用户给歌单。

---

## /lab EXP-002 / EXP-003 —— 验证与合并

**状态:** 已在 `worktree-lab-exp002-exp003` 分支实现(4 个 commit),`tsc --noEmit`、`eslint` 均干净。本环境(Cowork 沙盒)没有可用的 pnpm/网络,跑不了 `pnpm dev`/`pnpm build`,这一步一直卡在等本机验证。

**开工 prompt:**

```
在 myHomePage 仓库里,切到 worktree-lab-exp002-exp003 分支(.claude/worktrees/lab-exp002-exp003),
按 docs/superpowers/plans/2026-08-21-lab-exp002-exp003.md 的验收清单跑一遍:
pnpm dev 走查 EXP-002(tonight's tides)与 EXP-003(dream decay)两个实验页,
确认 reduced-motion 降级正常、EXP-003 的 localStorage 衰减不因 React Strict Mode 的双跑而错乱,
再跑 pnpm build:willsleep 确认双站构建都过。

全部通过后用 superpowers:finishing-a-development-branch 把这个分支合并回 main
(不要 push,合并后向我确认再决定是否 push)。

合并完成后:把 docs/BUILD-LOG.md 里这一行的 merge 格改成 ✅,期2 那一行也一并改成全 ✅,
并检查 DESIGN.md §9 期2 的完成标准是否已经满足。
```

---

## 期 3 · /photos 暗房

**范围(DESIGN.md §4/§5/§6):** sync-images 脚本(iCloud 检查 → sharp 转 webp → blurhash → exiftool → 传 R2)、R2 首次配置、瀑布流索引页、灯箱 + EXIF 展示。

**已知悬而未决的前提(round #4 提过,还没答):** R2 是否已经建好 bucket / 自定义域,还是要从零配置;照片素材是否已经按 roll 整理成文件夹。开工前先确认这两条,别让 prompt 跑到一半卡住。

**开工 prompt:**

```
实现 willsleep.dev 的 /photos 暗房(myHomePage 仓库,DESIGN.md §9 期3)。

先确认两个前提(问我,不要替我假设):
1. Cloudflare R2 bucket / 自定义域(建议 img.willsleep.dev)是否已经配置好,还是需要你带我从零走一遍
2. 要上线的照片素材现在在哪、有没有按 roll(拍摄批次)整理成文件夹

确认后按本仓库既定流程走:
1. superpowers:brainstorming 把还没定的细节过一遍(图片尺寸阶梯、manifest 具体字段、iCloud dataless 文件的超时降级策略)
2. 写 spec 到 docs/superpowers/specs/,规格参照 DESIGN.md §4(内容库约定)、§5(/photos 章节)、§6(图片同步管线)
3. superpowers:writing-plans 写任务级 plan 到 docs/superpowers/plans/
4. superpowers:using-git-worktrees 开隔离分支实现:scripts/sync-images.mjs、R2 配置、/photos 页面、image-manifest.json 写入
5. superpowers:test-driven-development 覆盖 manifest 生成与 frontmatter 校验逻辑
6. 完成后 superpowers:requesting-code-review 自查,superpowers:verification-before-completion 确认 tsc/eslint/pnpm build:willsleep 都过
   (pnpm 相关步骤如果在没有网络的沙盒里跑不了,明确告诉我,我在本机补跑)
7. superpowers:finishing-a-development-branch 合并回 main(不要自己 push)

完成后:更新 docs/DESIGN.md §9 期3 这一行的完成标准勾选情况,更新 docs/BUILD-LOG.md 对应状态行的四格。
```

---

## /reel 卷带间(未编号,建议排在 /photos 之后)

**状态:** spec 已写完并提交主干(`docs/superpowers/specs/2026-08-21-reel-room-design.md`,commit `04c8096`)。plan 还没写,实现还没开始。

**开工前必须先确认的两处判断(spec §4 里明确留白,不要替用户拍板):**

1. 导航词序——spec 建议把 `reel` 追加在 `ROOMS` 数组最后(`now · lab · notes · photos · about · reel`),而不是按语义插进 `lab`/`notes` 之间
2. `RoomStatuses.reel` 的门缝读数形态——spec 建议 `{ favorites: number, logEntries: number } | null`,仿照 `/lab` 现有的 `{ experiments, ongoing }`

**开工 prompt:**

```
实现 /reel 卷带间(myHomePage 仓库,spec 已在 docs/superpowers/specs/2026-08-21-reel-room-design.md,commit 04c8096)。

第一步:把 spec §4 里两处标了"待确认"的判断读给我,让我拍板:
1. 导航词序放在 about 之后(六词:now·lab·notes·photos·about·reel)还是别的位置
2. RoomStatuses.reel 是否用 { favorites, logEntries } | null 这个形态
不要替我决定这两条,确认之后才继续。

确认后:
1. superpowers:writing-plans 按 spec §1(切片范围)写任务级 plan 到 docs/superpowers/plans/
2. superpowers:using-git-worktrees 开隔离分支,实现 spec §2/§3 的内容契约(content/reel/index.md +
   lib/content-schema.ts 里的 zod 校验)、lib/content.ts 的 getReel()、lib/rooms.ts 的 reel 房间登记、
   app/reel/page.tsx、public/reel/ 封面图目录
3. 封面图走 /lab 的 poster 静态文件模式(public/reel/ 下的相对路径),不要接 R2 ——
   spec §2 已经把这点更正过,别按更早的口头说法去接 R2 管线
4. superpowers:test-driven-development 覆盖 getReel() 的空状态(favorites/log 各自为空时的渲染分支)
5. 完成后按 spec §9 的验收清单自查,包含 HOME-DESIGN.md §4.2 标记的
   "六词导航宽度需要真实浏览器人工复测"这一项
6. superpowers:requesting-code-review + superpowers:verification-before-completion
   (tsc/eslint/pnpm build,沙盒里跑不了的部分明确告诉我)
7. superpowers:finishing-a-development-branch 合并回 main(不要自己 push)

完成后:把这次对两处判断的确认结果写回 spec 文档末尾(补一行,不要改原文——这是这个仓库的档案纪律),
更新 docs/BUILD-LOG.md 对应状态行。
```

---

## 期 4 · /notes 档案室

**前置条件:** 排在 /photos(期3)之后——不是技术依赖,是既定排期,/photos 没上线前不要开工。

**范围(DESIGN.md §4/§5):** 内容库解析管线、zod frontmatter 校验、`new:note`/`new:dream`/`new:incident`/`new:roll` 脚手架脚本、列表页与文章页、RSS。

**开工 prompt:**

```
实现 willsleep.dev 的 /notes 档案室(myHomePage 仓库,DESIGN.md §9 期4)。

开工前确认 /photos(期3)是否已经合并上线——按既定排期,/notes 应该排在它之后,不要提前开工。

确认后按本仓库既定流程走:
1. superpowers:brainstorming 过一遍细节(note/dream/incident 三种类型各自的 REM/IR 编号分配逻辑、
   scaffold 脚本的交互问答设计)
2. 写 spec 到 docs/superpowers/specs/,规格参照 DESIGN.md §4(内容库约定与脚手架/校验小节)、§5(/notes 章节)
3. superpowers:writing-plans 写 plan 到 docs/superpowers/plans/
4. superpowers:using-git-worktrees 开隔离分支实现:lib/content-schema.ts 的 note/dream/incident zod
   schema、scripts/new-content.mjs 脚手架、/notes 列表与文章页、app/feed.xml/route.ts
5. superpowers:test-driven-development 覆盖 zod 校验(故意写坏一个字段,构建应报错并指明文件——
   这是 DESIGN.md §9 期4 写明的完成标准之一)
6. superpowers:requesting-code-review + superpowers:verification-before-completion
   (tsc/eslint/pnpm build,沙盒跑不了的部分告诉我)
7. superpowers:finishing-a-development-branch 合并回 main(不要自己 push)

完成后:发布第一篇 note、第一条 REM、第一份 IR(均由脚手架创建,不要手写——这也是完成标准的一部分),
更新 docs/DESIGN.md §9 期4 与 docs/BUILD-LOG.md 对应状态行。
```

---

## 期 5 · /zh /en 翻译版

**前置条件:** 排在最后,建议 /photos、/notes、/reel 都上线后再做——翻译需要有内容可翻。

**范围(DESIGN.md §7):** canonical/zh/en 双路由树、UI 字典(`lib/i18n/strings.ts`)、hreflang alternates、页脚语言切换器。

**开工 prompt:**

```
实现 willsleep.dev 的多语言路由(myHomePage 仓库,DESIGN.md §9 期5,规格全文见 DESIGN.md §7)。

开工前确认这时候 /photos、/notes、/reel 里已经有多少内容上线——期5 的完成标准要求 about + now
有 zh/en 全译,内容越多这期工作量越大,建议在其他房间基本稳定后再开工。

按本仓库既定流程走:
1. superpowers:brainstorming 过一遍细节(具体先翻哪些页面、回落标注的文案措辞)
2. 写 spec 到 docs/superpowers/specs/,规格参照 DESIGN.md §7 全文(三个版本定义、路由实现、
   内容解析与回落、UI 字典、SEO)
3. superpowers:writing-plans 写 plan 到 docs/superpowers/plans/
4. superpowers:using-git-worktrees 开隔离分支实现:app/[locale] 动态段、lib/i18n/strings.ts、
   hreflang alternates、页脚切换器、翻译文件回落逻辑
5. superpowers:test-driven-development 覆盖回落逻辑(译文缺失时是否正确回落到 canonical 并打 noindex)
6. superpowers:requesting-code-review + superpowers:verification-before-completion
   (tsc/eslint/pnpm build,沙盒跑不了的部分告诉我)
7. superpowers:finishing-a-development-branch 合并回 main(不要自己 push)

完成后:确认 about + now 有 zh/en 全译、回落页有标注且 noindex、sitemap 只收真实翻译、
任意页面三版互切不 404,更新 docs/DESIGN.md §9 期5 与 docs/BUILD-LOG.md 对应状态行。
```

---

## 关于这份文档

- 四格含义:`spec` = 设计文稿已写并提交;`plan` = 任务级实施计划已写并提交;`build` = 代码已在隔离 worktree 里实现;`merge` = 已合并回 main。🟡 表示这一格里的内容不是铁板一块的一整块(比如期2 三个实验里有的合并了有的没有)。
- 这份文件由 Claude 在 2026-08-22 创建并首次填写,数据核对自 `git log`、`docs/superpowers/{specs,plans}` 目录内容与 DESIGN.md §9 当时的内容。`docs/BUILD-LOG.html` 随后同一天加入仓库,是这份文件的 HTML 渲染版(与托管的 Claude Artifact 内容一致)。
- git push 是"上线"决定,不属于任何一条开工 prompt 里的常规步骤——每条 prompt 都写明了合并后要跟你确认,不要在没问过的情况下自己 push。
