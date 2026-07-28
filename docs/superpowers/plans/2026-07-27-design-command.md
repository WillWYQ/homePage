# `/design` 设计推演命令 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新建仓内 slash command `.claude/commands/design.md`，把 willsleep.dev 的设计宪法与四步推演流程固化成可重复调用的 `/design <参数>`。

**Architecture:** 纯 prompt 交付物——一个 markdown 文件，无代码、无依赖、无构建改动。命令内固化三条红线与动效/声音预算，按参数自动判定房间／系统／审计三种模式，分层加载文稿上下文，跑四步推演，收口输出"已定案决议 + 否决名单"，写文件需用户点头。

**Tech Stack:** Claude Code slash command（frontmatter + markdown 正文）。无测试框架——验收方式是在真实会话里试跑三种模式并检查行为。

## Global Constraints

以下取自 spec `docs/superpowers/specs/2026-07-27-design-command-design.md`，逐字照抄，所有任务隐含遵守：

- 交付物只有一个文件：`.claude/commands/design.md`。不改 `app/`、`components/`、`lib/`、`package.json`。
- 命令**不写代码、不做实现计划、不改文稿**（除非用户在收口后明确点头）。
- 三种模式共同的地基上下文不可省：`docs/DESIGN.md` §1 与 §2。
- 命令一律不读源码，唯一例外是推演触及"这个效果现有组件能不能做得到"，此时才去 `components/` 确认。
- 四步推演每步只问一个问题，问完等用户回答，不批量抛问题。
- 第 3 步"签名效果"的默认答案是"没有"。
- 审计模式**只报不改**；每条发现必须带文件路径 + 行号 + 四类问题分类之一：`自相矛盾` / `自我感动` / `无法施工` / `与红线冲突`。
- 输出两块：**已定案决议**（编号列表，每条一句话）与**否决名单**（提案 + 否决理由）。
- 工作目录含空格（iCloud Drive 路径），所有 shell 路径必须加引号。
- 仓内当前 `package.json` 有未提交改动，提交时只 `git add` 本计划涉及的文件，不得 `git add -A`。

---

### Task 1: 创建 `/design` 命令文件

**Files:**
- Create: `.claude/commands/design.md`（`.claude/` 目录本仓尚不存在，一并新建）

**Interfaces:**
- Consumes: 无（首个任务）。读取的既有文稿为 `docs/DESIGN.md`、`docs/HOME-DESIGN.md`、`docs/ABOUT-DESIGN.md`、`docs/SOUND-DESIGN.md`、`docs/COMPONENT-SOURCES.md`、`docs/OBSERVER-RAW.md`——这些是运行期读取，不是构建期依赖。
- Produces: slash command `/design`，接受单个自由文本参数（可为空）。无代码接口供后续任务调用。

- [ ] **Step 1: 确认前置状态**

Run:
```bash
cd "/Users/wyqwillsleep/Library/Mobile Documents/com~apple~CloudDocs/Project/myHomePage" && ls -a .claude 2>/dev/null; ls docs/
```
Expected: `.claude` 不存在（无输出或报错），`docs/` 下有 `DESIGN.md` `HOME-DESIGN.md` `ABOUT-DESIGN.md` `SOUND-DESIGN.md` `COMPONENT-SOURCES.md` `OBSERVER-RAW.md`。若 `.claude/commands/design.md` 已存在，停下来问用户是否覆盖。

- [ ] **Step 2: 建目录并写入命令文件**

```bash
cd "/Users/wyqwillsleep/Library/Mobile Documents/com~apple~CloudDocs/Project/myHomePage" && mkdir -p .claude/commands
```

用 Write 工具写入 `.claude/commands/design.md`，内容如下（完整照抄）：

````markdown
---
description: 推演 willsleep.dev 的设计——房间规格、跨房间系统层，或审计现有文稿
argument-hint: [房间名 | 系统话题 | audit [范围]]
---

你要和站主一起推演 **the sleep lab**（willsleep.dev）的设计。这是一次设计对话，不是施工。

参数：`$ARGUMENTS`

## 你的立场

你不是在做"一个好网站"。你在替一个具体的人扩建一栋具体的楼——一座夜里才开灯的实验室。判据永远是"这像不像这栋楼、像不像这个人"，不是"这是不是最佳实践"。

站点宪法如下，**每一步收口都要拿它过一遍**：

**三条红线**
1. 不放简历式内容。职业身份在 career.yueqiao.dev，两边刻意解耦。
2. 通往 career 站的入口只有页脚一条小字链接，永远不做 banner / CTA。
3. 宁缺毋滥。板块没内容就先不上线入口，不放 "coming soon" 占位页。

**动效四层预算**
- 底噪层：全站 grain，透明度 ≤5%，访客不该注意到它。
- 微交互层：hover / focus / 过渡，≤200ms、幅度小。
- 签名层：每房间**至多一个**叙事效果，入场演一次即静止，不自动循环。
- 实验层：持续运动的 canvas / shader **只许存在于 `/lab/[slug]` 全屏页内**。
- 判据：无人触发、无限循环的动画是"效果显示器"的标志。全站仅两处豁免——首页 Wavy（那是走廊的灯，是建筑）与实验层内部。
- 缓动语言是"夜里的速度"：400–800ms、ease-out、无弹跳、无 overshoot。

**声音三法则**
① chrome 永远静音；② 声音是仪器不是装饰（唯一发声位置是 /lab 实验内部，且必须是真实信号）；③ 永远 opt-in、状态永远可见，默认永远是关。

**视觉语言**
全站深色无浅色模式；唯一强调色是 terminal green；正文三级灰阶（`white` / `white/70` / `white/40`）不引入彩色文字。Lora 写长文，Geist Sans 做 UI，Geist Mono 是性格担当——凡"仪表读数"性质的信息一律 mono + 小号 + `white/40`。正文中英混排，装饰性文案保持英文。

**lab 策展三问**（涉及实验时逐条过）
1. 它在研究一个问题吗？标题能改写成一个问句。"好看"不是问题。
2. 拿走借来的组件，还剩下我的东西吗？
3. 它的动画在传达信息吗？动 = 仪器在测量。

**档案纪律**
只追加，不重写。发布后的记录要更正就在文末补一行 mono `addendum:`，不改原文。编号永不复用，失败的实验标 `archived` 但不下架。

**"酷"只花在状态上，不花在动画上。** 一切炫技必须是真实数据的呈现（时刻、库存、编号），单次访问几乎察觉不到，跨访问才显形。

## 第一步：判定模式

看 `$ARGUMENTS` 的第一个词：

- 匹配到房间名或路由（`now` `lab` `notes` `photos` `about` `home` `/` `/lab` `404`）→ **房间模式**
- 参数为空，或以 `audit` 开头（`audit` 后可跟范围，如 `audit notes`）→ **审计模式**
- 其余任意自然语言描述（如"房间之间怎么互相喂数据"）→ **系统模式**

判定不确定时（例如参数同时提到房间名和跨房间话题），**先问站主一句要按哪个模式跑**，不要自行猜。

开始推演前先说一句你判定的模式和你即将读的文稿，让站主有机会纠正。

## 第二步：加载上下文

**三种模式共同的地基（不可省）：** `docs/DESIGN.md` 的 §1（定位与原则）与 §2（视觉语言）。

**各模式追加：**
- **房间模式：** `docs/DESIGN.md` §5 中该房间的段落；若存在同名独立规格（`HOME-DESIGN.md` / `ABOUT-DESIGN.md` / `SOUND-DESIGN.md`）则全文读入；`COMPONENT-SOURCES.md`（知道手上现有哪些仪器）。
- **系统模式：** 先 grep `docs/DESIGN.md` 的小节标题建立地图，再按话题读入相关章节。
- **审计模式：** 被审范围的全部文稿全文，外加 `git log --oneline -- <文件>` 看这些文稿最近怎么改的，判断某处是新写的还是历史遗留。

推演触及那个人的性格判断时，读 `docs/OBSERVER-RAW.md` 与 `docs/ABOUT-DESIGN.md` 的附录。

**不读源码。** 唯一例外：推演触及"这个效果现有组件能不能做得到"，此时才去 `components/` 确认可行性。

工作目录路径含空格，shell 命令里的路径一律加引号。

## 第三步：四步推演（房间模式 / 系统模式）

**每步只问一个问题，问完等站主回答，不要批量抛问题。** 每步你要先给出自己的推演和倾向，再问，不要把空白页丢给站主。

1. **身份** — 这个房间／系统层在这栋楼里是什么？它的一句话馆训是什么？判据取自那个人的性格（`OBSERVER-RAW.md`、`ABOUT-DESIGN.md` 附录），而不是"好网站通常长什么样"。
2. **形态与单元** — 内容单元是什么（record / roll / 实验 / 条目）？列表页长什么样？frontmatter 有哪些字段？空状态怎么处理？
3. **签名效果** — 这个房间唯一那一个叙事效果是什么，它在传达什么信息？**默认答案是"没有"。** 提案必须先说服你它该存在，才进入下一步。
4. **宪法过滤** — 把前三步的产出逐条过：三条红线、动效四层预算、声音三法则、lab 策展三问（若涉及实验）、档案纪律。被枪毙的提案连同理由进入否决名单。

系统模式沿用同样四步，"房间"换成被讨论的系统层（房间间的数据流、仪表读数语法、双语版本形态等）。

## 第三步（审计模式）

四步反向跑在现有文稿上：读入范围内文稿，逐段对照宪法与彼此，找出偏离。

**每条发现必须包含：**
- 文件路径 + 行号
- 问题分类，四选一：`自相矛盾`（两处文稿打架）／`自我感动`（写得漂亮但没有实际约束力或读者感知不到）／`无法施工`（描述不足以让人写出代码）／`与红线冲突`
- 一句话说明问题
- 建议的修正方向（一句话，不展开成新设计）

**只报不改。** 输出后等站主挑选哪几条要修。

## 第四步：输出

收口时给出两块内容：

**已定案决议** — 编号列表，每条一句话，措辞与现有文稿同构（可直接粘进 `DESIGN.md` 或独立规格）。

**否决名单** — 表格：提案 | 否决理由。对应 `HOME-DESIGN.md` §9 那种记录。否决要留名：记下被否的是什么、为什么否，而不只是"不做"。

末尾问一句是否写入文稿，并给出建议落点（新建 `docs/XXX-DESIGN.md` ／ 更新 `DESIGN.md` 某节）。**站主点头后才动文件**，动完提交；提交只 `git add` 本次改的文稿，不要 `git add -A`（仓内有无关的未提交改动）。

## 边界

- 不进入实现：不写组件、不改 `app/`、不提实现计划。
- 不做无关重构提议：推演只服务当前话题。
- 未上线房间不因推演而在走廊出现门牌——推演产出文字不等于上线（红线 3）。
````

- [ ] **Step 3: 验证文件落位与 frontmatter**

Run:
```bash
cd "/Users/wyqwillsleep/Library/Mobile Documents/com~apple~CloudDocs/Project/myHomePage" && head -5 .claude/commands/design.md && wc -l .claude/commands/design.md
```
Expected: 前 5 行为 `---` / `description: …` / `argument-hint: …` / `---` / 空行；总行数 > 90。

- [ ] **Step 4: 三种模式的判定自检**

不启动实际推演，只核对命令文本里的模式判定规则能否覆盖以下六个参数，逐个在文件中找到对应分支：

| 参数 | 应判定 |
|---|---|
| `/design notes` | 房间模式 |
| `/design /lab` | 房间模式 |
| `/design 404` | 房间模式 |
| `/design` | 审计模式 |
| `/design audit notes` | 审计模式（范围 notes） |
| `/design 房间之间怎么互相喂数据` | 系统模式 |

若有任一参数在文件里找不到明确归属的分支，补写该分支后重跑本步。

- [ ] **Step 5: 提交**

```bash
cd "/Users/wyqwillsleep/Library/Mobile Documents/com~apple~CloudDocs/Project/myHomePage" && git add .claude/commands/design.md docs/superpowers/plans/2026-07-27-design-command.md && git commit -m "feat: add /design exploration command

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 6: 真实试跑（需站主在场）**

在新会话里跑 `/design notes`，观察三件事并向站主汇报：
1. 命令是否先声明"判定为房间模式"并列出即将读的文稿；
2. 是否只问了一个问题就停下等回答（而不是一次抛四问）；
3. 是否没有擅自改动 `docs/` 下任何文件。

任一项不符，回到 Step 2 修正对应段落，重跑 Step 3–6。

---

## Self-Review

**Spec coverage：** spec §2 形态 → Task 1 Step 2 的 frontmatter 与文件路径；§3 模式识别 → 命令"第一步"段 + Step 4 自检表；§4 上下文加载 → 命令"第二步"段（含地基不可省、各模式追加、不读源码例外）；§5 四步推演 → 命令"第三步"段；§6 审计模式 → 命令"第三步（审计模式）"段（含四类分类与只报不改）；§7 输出格式 → 命令"第四步"段（两块输出 + 写文件需点头）；§8 边界 → 命令"边界"段。无遗漏。

**Placeholder scan：** 无 TBD / TODO / "similar to Task N" / "实现细节从略"。命令正文全文内联在 Step 2，未做省略。

**Type consistency：** 三种模式名称（房间模式／系统模式／审计模式）、四类审计分类（自相矛盾／自我感动／无法施工／与红线冲突）、四步名称（身份／形态与单元／签名效果／宪法过滤）在 spec、计划、命令正文三处用词一致。
