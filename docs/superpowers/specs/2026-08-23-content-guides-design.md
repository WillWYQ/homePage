# content-guides 设计:每个 section 一份"怎么写内容"参考

## 背景与目标

`content/` 下六个房间(now / lab / notes / photos / about / reel)的 frontmatter 格式、
文件布局、校验行为都散落在 `lib/content.ts`、`lib/content-schema.ts`、
`scripts/sync-images.mjs` 与各自的 `docs/superpowers/specs/*.md` 里。下次要往任何
一个房间加内容时,得重新翻代码才能确认字段名、必填项、校验是宽容还是严格。

本次要补的是**内部参考文档**——给用户自己或 Claude 下次写内容前查,不是给站点访客看
的公开教程,不接入路由,不改任何运行时代码。

## 范围

**做:**

- 新增 `docs/content-guides/` 目录,6 个文件:`now.md` `about.md` `lab.md`
  `photos.md` `reel.md` `notes.md`
- 前 5 个文件(`now`/`about`/`lab`/`photos`/`reel`)各自覆盖:
  1. **文件位置** —— `content/<room>/index.md`,或 `lab`/`photos` 的按 slug/roll
     分目录布局
  2. **frontmatter 字段表** —— 字段名、类型、是否必填、渲染到哪里;`photos`/`reel`
     从 `lib/content-schema.ts` 的 zod schema 摘,`now`/`about`/`lab` 从
     `lib/content.ts` 里对应 `get*()` 函数的 ad-hoc 解析逻辑摘
  3. **一个真实可用的示例** —— 直接摘自仓库现有内容文件(`content/now/index.md`、
     `content/about/index.md`、`content/lab/001-breathing-field/index.md`),不
     虚构;`photos`/`reel` 目前没有完整示例,用 schema 反推一个最小合法样例并标注
     "未在仓库里实际跑过"
  4. **该 section 特有的坑**,例如:
     - `now`/`about`/`lab` 走 `lib/content.ts` 里手写的 ad-hoc 解析:字段类型不对
       或缺失会被静默丢弃(不渲染),不会报错——红线 3(空 section 不渲染,不留假占位)
     - `photos`/`reel` 走 `lib/content-schema.ts` 的 zod 校验:frontmatter 不合法
       会直接抛错、build 失败(单作者站点提前暴露拼写错误优于悄悄丢内容)
     - `photos` 除了 frontmatter,还有一条完整管线:原图放
       `content/photos/<roll>/*.{jpg,png,webp,heic}` → 跑
       `npm run sync:images`(需要 iCloud 文件已下载到本地,否则等 iCloud 物化或
       超时跳过;需要 `R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`/
       `R2_BUCKET`/`R2_PUBLIC_BASE_URL` 五个环境变量)→ 生成/更新
       `content/image-manifest.json` 并把四档尺寸传到 R2 → 页面据 manifest 渲染,
       `index.md` 只是可选的标题/日期/图片顺序元数据,没有 `index.md` 也能显示
       (roll 目录名当标题,文件按字典序排)
     - `reel` 的 `sleeve` 封面图不走 R2,是 `public/reel/` 下的静态文件,
       frontmatter 里写根相对路径字符串
  5. **一句指向 `lib/rooms.ts` 的提醒** —— 内容写完 ≠ 房间上线,走廊门牌是否出现
     由 `open: true/false` 单独控制,是一个独立的、人工做的决定
- `notes.md` 写占位说明:目前没有 schema、没有 `getNotes()`、没有 `content/notes/`
  目录(对比其余 5 个房间在代码里的落点),第 3 期实现内容管道时参照 `lab`(纯
  frontmatter + 正文段落)或 `photos`(带独立同步脚本的资源管线)的既有模式来写,
  而不是从零设计

**不做:**

- 不做成站内路由或公开页面(用户已确认:内部参考,不对外)
- 不重构 `lib/content.ts`/`lib/content-schema.ts` 本身,只是给现状写文档
- 不推进 notes 房间的实际实现(schema、reader、page),那是第 3 期单独的活

## 文件模板(前 5 个文件共用结构)

```markdown
# <room> 内容怎么写

## 文件位置
...

## frontmatter 字段
| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|

## 示例
```yaml
...
```

## 坑
- ...

## 上线
写完内容不会自动出现在走廊——去 `lib/rooms.ts` 把对应 `open` 改成 `true`。
```

## 完成标准

- `docs/content-guides/` 下 6 个 `.md` 文件全部落地
- 每个字段表里的字段名与类型跟 `lib/content.ts`/`lib/content-schema.ts` 当前实现
  逐一核对一致(不是凭记忆写)
- 每个非占位文件的示例是仓库真实内容的摘录,或明确标注"反推示例,未实跑"
- 不改动任何 `.ts`/`.tsx` 文件、不加依赖、不动路由
