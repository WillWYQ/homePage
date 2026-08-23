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
| 2 | /lab 实验区 | ✅ | ✅ | ✅ | 🟡 | EXP-001 已合并;EXP-002/003 已实现并完成本机验证(`tsc`/`eslint`/双站 `build` 均过,`pnpm dev` 走查通过,含一处 reduced-motion 修复),[PR #2](https://github.com/WillWYQ/homePage/pull/2) 待合并——DESIGN §9 期2 的完成标准已满足,仅差 merge 这一格 |
| — | infra · CI/CD 完善 | ✅ | ✅ | ✅ | ✅ | 直接在 main 上做的,没走 worktree |
| 3 | /photos 暗房 | ✅ | ✅ | ✅ | ⬜ | 管线与页面已实现、本机验证、[PR #3](https://github.com/WillWYQ/homePage/pull/3) 待合并;R2 未配置、无真实素材,内容上线待用户完成 R2 配置后自行运行 `pnpm sync:images` |
| — | /reel 卷带间 | ✅ | ⬜ | ⬜ | ⬜ | spec 已提交(`04c8096`);两处判断待确认,见下 |
| 4 | /notes 档案室 | ⬜ | ⬜ | ⬜ | ⬜ | 排在 /photos 之后(round #4 决定) |
| 5 | /zh /en 翻译版 | ⬜ | ⬜ | ⬜ | ⬜ | 建议其他房间稳定后再做 |

独立并行、不占以上任何一期:`/about` 收藏架的音乐 shelf 待填真实曲目——纯内容型任务,不需要开工 prompt,等用户给歌单。

---

## /lab EXP-002 / EXP-003 —— 验证与合并

**状态(2026-08-21 本机验证完成):** `worktree-lab-exp002-exp003` 分支(5 个 commit)已过本机验证——`npx tsc --noEmit` 干净;`pnpm dev` 用 Playwright 走查两个实验页:EXP-002 bedtime 默认取本地时间、5 个浅睡窗口按 90min 周期+14min 缓冲正确计算、reduced-motion 降级为逐字节相同的静态帧;EXP-003 提交零网络请求(仅 localStorage)、连续刷新下 `decayCount` 精确按 1 递增(证明 StrictMode 双跑守卫生效)、25 次刷新后可读词精确停在 20% 下限、锚点词全程不变。验证过程中发现并修复一处真实缺陷:字符抖动动画完全没读 `prefers-reduced-motion`,已在 `864031e` 修复并回归验证。`pnpm build:willsleep`/`pnpm build:yueqiao` 均过,yueqiao 产物里 `/lab/*` 仍 404 门控、sitemap 不含 lab。已推送并开 [PR #2](https://github.com/WillWYQ/homePage/pull/2),worktree 保留用于处理 review 反馈。**PR 合并后**把上面表格这一行的 merge 格改成 ✅。

**剩下的唯一步骤:** 上面这份验证已经跑完,不需要再开新会话重复。review/合并 [PR #2](https://github.com/WillWYQ/homePage/pull/2) 后,把本节表格行的 merge 格改成 ✅(`worktree-lab-exp002-exp003` worktree 留着处理 review 反馈,合并后再清理)。

---

## 期 3 · /photos 暗房

**状态(2026-08-22 完成 spec/plan/build,[PR #3](https://github.com/WillWYQ/homePage/pull/3) 待合并):** 两个开工前提已确认——R2 从零配置(用户后续自行完成,脚本无凭据时拒绝写 manifest);暂无真实素材,占位图跑通全流程。规格 [2026-08-21-photos-darkroom-design.md](superpowers/specs/2026-08-21-photos-darkroom-design.md)(经 subagent 审查修复一轮)→ 计划 [2026-08-22-photos-darkroom.md](superpowers/plans/2026-08-22-photos-darkroom.md)(15 任务)→ `worktree-photos-darkroom` 分支按 subagent-driven-development 逐任务实现,每任务独立测试+审查(其中 Task 3 的 iCloud 超时模块审查中发现并修复一处真实的挂死风险)→ 最终整体审查发现并修复 5 处问题(其中一处是本分支自己引入的 CI 破坏性回归:Task 1 的 `pnpm add` 把 `next` 从 16.2.12 升到 16.3.2,导致 `next.config.ts` 里一个已被 Next 弃用的 `experimental.viewTransition` 键报错,连带 typecheck 与两站 build 全部失败)。`npx tsc --noEmit`/`pnpm lint`/`pnpm test`(43/43)/`pnpm build:willsleep`/`pnpm build:yueqiao` 均过,`pnpm sync:images --dry-run` 幂等验证通过。**管线已交付,内容未上线**(见下方范围说明)。

**范围(DESIGN.md §4/§5/§6):** sync-images 脚本(iCloud 检查 → sharp 转 webp → blurhash → exiftool → 传 R2)、R2 首次配置、瀑布流索引页、灯箱 + EXIF 展示。

**开工 prompt(存档,本期已完成,留作以后同类任务参考):**

```
这个任务必须用本仓库已有的 superpowers skill 套件完成——下面每一步都是要你真的调用对应的 skill,
不是读一下当参考,不要用自己临时拼的流程代替。开工先调用 `superpowers:using-superpowers`。

实现 willsleep.dev 的 /photos 暗房(myHomePage 仓库,DESIGN.md §9 期3)。

先确认两个前提(问我,不要替我假设):
1. Cloudflare R2 bucket / 自定义域(建议 img.willsleep.dev)是否已经配置好,还是需要你带我从零走一遍
2. 要上线的照片素材现在在哪、有没有按 roll(拍摄批次)整理成文件夹

确认后按顺序调用:
1. 调用 `superpowers:brainstorming`,把还没定的细节过一遍(图片尺寸阶梯、manifest 具体字段、
   iCloud dataless 文件的超时降级策略),产出写到 docs/superpowers/specs/ 的 spec ——
   规格参照 DESIGN.md §4(内容库约定)、§5(/photos 章节)、§6(图片同步管线)
2. 调用 `superpowers:writing-plans`,把 spec 落成任务级 plan,写到 docs/superpowers/plans/
3. 调用 `superpowers:using-git-worktrees`,开一个隔离 worktree
4. 调用 `superpowers:subagent-driven-development`,在这个 worktree 里按 plan 执行各项任务:
   scripts/sync-images.mjs、R2 配置、/photos 页面、image-manifest.json 写入
5. 每项任务落地代码前先调用 `superpowers:test-driven-development`,尤其是 manifest 生成与
   frontmatter 校验逻辑
6. 调用 `superpowers:requesting-code-review` 自查一遍(review 有意见的话,调用
   `superpowers:receiving-code-review` 处理,不要不假思索照做)
7. 调用 `superpowers:verification-before-completion`,真的跑一遍 tsc/eslint/pnpm build:willsleep
   并确认通过,才能说"完成"(pnpm 相关步骤如果在没有网络的沙盒里跑不了,明确告诉我,我在本机补跑)
8. 调用 `superpowers:finishing-a-development-branch`,决定怎么合并回 main(不要自己 push)

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
这个任务必须用本仓库已有的 superpowers skill 套件完成——下面每一步都是要你真的调用对应的 skill。
开工先调用 `superpowers:using-superpowers`。

实现 /reel 卷带间(myHomePage 仓库,spec 已在 docs/superpowers/specs/2026-08-21-reel-room-design.md,commit 04c8096)。

第一步:把 spec §4 里两处标了"待确认"的判断读给我,让我拍板:
1. 导航词序放在 about 之后(六词:now·lab·notes·photos·about·reel)还是别的位置
2. RoomStatuses.reel 是否用 { favorites, logEntries } | null 这个形态
不要替我决定这两条,确认之后才继续。

确认后按顺序调用:
1. 调用 `superpowers:writing-plans`,按 spec §1(切片范围)把它落成任务级 plan,写到
   docs/superpowers/plans/
2. 调用 `superpowers:using-git-worktrees`,开一个隔离 worktree
3. 调用 `superpowers:subagent-driven-development`,在这个 worktree 里执行 spec §2/§3 的内容契约
   (content/reel/index.md + lib/content-schema.ts 里的 zod 校验)、lib/content.ts 的 getReel()、
   lib/rooms.ts 的 reel 房间登记、app/reel/page.tsx、public/reel/ 封面图目录 —— 封面图走 /lab 的
   poster 静态文件模式(public/reel/ 下的相对路径),不要接 R2:spec §2 已经把这点更正过,
   别按更早的口头说法去接 R2 管线
4. 调用 `superpowers:test-driven-development`,覆盖 getReel() 的空状态(favorites/log 各自为空时
   的渲染分支)
5. 完成后按 spec §9 的验收清单自查,包含 HOME-DESIGN.md §4.2 标记的
   "六词导航宽度需要真实浏览器人工复测"这一项
6. 调用 `superpowers:requesting-code-review`(review 有意见的话,调用
   `superpowers:receiving-code-review` 处理,不要不假思索照做)
7. 调用 `superpowers:verification-before-completion`,真的跑一遍 tsc/eslint/pnpm build 并确认
   通过(沙盒里跑不了的部分明确告诉我)
8. 调用 `superpowers:finishing-a-development-branch`,决定怎么合并回 main(不要自己 push)

完成后:把这次对两处判断的确认结果写回 spec 文档末尾(补一行,不要改原文——这是这个仓库的档案纪律),
更新 docs/BUILD-LOG.md 对应状态行。
```

---

## 期 4 · /notes 档案室

**前置条件:** 排在 /photos(期3)之后——不是技术依赖,是既定排期,/photos 没上线前不要开工。

**范围(DESIGN.md §4/§5):** 内容库解析管线、zod frontmatter 校验、`new:note`/`new:dream`/`new:incident`/`new:roll` 脚手架脚本、列表页与文章页、RSS。

**开工 prompt:**

```
这个任务必须用本仓库已有的 superpowers skill 套件完成——下面每一步都是要你真的调用对应的 skill。
开工先调用 `superpowers:using-superpowers`。

实现 willsleep.dev 的 /notes 档案室(myHomePage 仓库,DESIGN.md §9 期4)。

开工前确认 /photos(期3)是否已经合并上线——按既定排期,/notes 应该排在它之后,不要提前开工。

确认后按顺序调用:
1. 调用 `superpowers:brainstorming`,过一遍细节(note/dream/incident 三种类型各自的 REM/IR
   编号分配逻辑、scaffold 脚本的交互问答设计),产出写到 docs/superpowers/specs/ 的 spec ——
   规格参照 DESIGN.md §4(内容库约定与脚手架/校验小节)、§5(/notes 章节)
2. 调用 `superpowers:writing-plans`,把 spec 落成 plan,写到 docs/superpowers/plans/
3. 调用 `superpowers:using-git-worktrees`,开一个隔离 worktree
4. 调用 `superpowers:subagent-driven-development`,在这个 worktree 里执行各项任务:
   lib/content-schema.ts 的 note/dream/incident zod schema、scripts/new-content.mjs 脚手架、
   /notes 列表与文章页、app/feed.xml/route.ts
5. 调用 `superpowers:test-driven-development`,覆盖 zod 校验(故意写坏一个字段,构建应报错并
   指明文件——这是 DESIGN.md §9 期4 写明的完成标准之一)
6. 调用 `superpowers:requesting-code-review`(review 有意见的话,调用
   `superpowers:receiving-code-review` 处理,不要不假思索照做)
7. 调用 `superpowers:verification-before-completion`,真的跑一遍 tsc/eslint/pnpm build 并确认通过
   (沙盒跑不了的部分告诉我)
8. 调用 `superpowers:finishing-a-development-branch`,决定怎么合并回 main(不要自己 push)

完成后:发布第一篇 note、第一条 REM、第一份 IR(均由脚手架创建,不要手写——这也是完成标准的一部分),
更新 docs/DESIGN.md §9 期4 与 docs/BUILD-LOG.md 对应状态行。
```

---

## 期 5 · /zh /en 翻译版

**前置条件:** 排在最后,建议 /photos、/notes、/reel 都上线后再做——翻译需要有内容可翻。

**范围(DESIGN.md §7):** canonical/zh/en 双路由树、UI 字典(`lib/i18n/strings.ts`)、hreflang alternates、页脚语言切换器。

**开工 prompt:**

```
这个任务必须用本仓库已有的 superpowers skill 套件完成——下面每一步都是要你真的调用对应的 skill。
开工先调用 `superpowers:using-superpowers`。

实现 willsleep.dev 的多语言路由(myHomePage 仓库,DESIGN.md §9 期5,规格全文见 DESIGN.md §7)。

开工前确认这时候 /photos、/notes、/reel 里已经有多少内容上线——期5 的完成标准要求 about + now
有 zh/en 全译,内容越多这期工作量越大,建议在其他房间基本稳定后再开工。

确认后按顺序调用:
1. 调用 `superpowers:brainstorming`,过一遍细节(具体先翻哪些页面、回落标注的文案措辞),
   产出写到 docs/superpowers/specs/ 的 spec —— 规格参照 DESIGN.md §7 全文(三个版本定义、
   路由实现、内容解析与回落、UI 字典、SEO)
2. 调用 `superpowers:writing-plans`,把 spec 落成 plan,写到 docs/superpowers/plans/
3. 调用 `superpowers:using-git-worktrees`,开一个隔离 worktree
4. 调用 `superpowers:subagent-driven-development`,在这个 worktree 里执行各项任务:
   app/[locale] 动态段、lib/i18n/strings.ts、hreflang alternates、页脚切换器、翻译文件回落逻辑
5. 调用 `superpowers:test-driven-development`,覆盖回落逻辑(译文缺失时是否正确回落到 canonical
   并打 noindex)
6. 调用 `superpowers:requesting-code-review`(review 有意见的话,调用
   `superpowers:receiving-code-review` 处理,不要不假思索照做)
7. 调用 `superpowers:verification-before-completion`,真的跑一遍 tsc/eslint/pnpm build 并确认通过
   (沙盒跑不了的部分告诉我)
8. 调用 `superpowers:finishing-a-development-branch`,决定怎么合并回 main(不要自己 push)

完成后:确认 about + now 有 zh/en 全译、回落页有标注且 noindex、sitemap 只收真实翻译、
任意页面三版互切不 404,更新 docs/DESIGN.md §9 期5 与 docs/BUILD-LOG.md 对应状态行。
```

---

## 关于这份文档

- 四格含义:`spec` = 设计文稿已写并提交;`plan` = 任务级实施计划已写并提交;`build` = 代码已在隔离 worktree 里实现;`merge` = 已合并回 main。🟡 表示这一格里的内容不是铁板一块的一整块(比如期2 三个实验里有的合并了有的没有)。
- 这份文件由 Claude 在 2026-08-22 创建并首次填写,数据核对自 `git log`、`docs/superpowers/{specs,plans}` 目录内容与 DESIGN.md §9 当时的内容。`docs/BUILD-LOG.html` 随后同一天加入仓库,是这份文件的 HTML 渲染版(与托管的 Claude Artifact 内容一致)。
- git push 是"上线"决定,不属于任何一条开工 prompt 里的常规步骤——每条 prompt 都写明了合并后要跟你确认,不要在没问过的情况下自己 push。
