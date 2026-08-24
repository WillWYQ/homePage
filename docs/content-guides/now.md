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
`now` 房间目前已经 `open: true`(`lib/rooms.ts`),不需要额外操作;房间的整体
可见性是由 `lib/rooms.ts` 里 `open` 这个独立开关控制的(`photos.md`/`reel.md`
里 `open: false` 就是这个开关的例子),只是眼下不需要碰它。
