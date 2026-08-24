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
| `poster` | string \| null | 否(默认 `null`) | 海报图路径,指向 `public/lab/` 下的静态文件(如 `/lab/001-breathing-field.svg`),`<img src>` 直接渲染,**不走 R2**、零管线。 |

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
