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
