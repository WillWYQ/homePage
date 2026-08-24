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
