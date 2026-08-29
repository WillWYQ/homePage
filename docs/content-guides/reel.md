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
| `favorites[].sleeve` | string | 否 | 封面图路径,必须匹配 `^/reel/.+\.(jpe?g\|png\|webp\|svg)$`(大小写不敏感)——即以 `/reel/` 开头。指向 `public/reel/` 下的静态文件,**不走 R2**、零管线。加载失败或缺失时优雅降级成纯文字卡,不留破图占位。 |
| `favorites[].href` | string | 否 | 外链,必须匹配 `^https?://`(http/https 开头,大小写不敏感)。 |
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
- 封面图的 `alt` 由渲染层写死为空字符串(`components/reel/reel-sleeve.tsx` 约第
  31 行,`<img alt="" ... />`,装饰性图片的显式声明)——frontmatter 里不需要也
  无法提供这个字段,不是漏填。

## 上线
`reel` 房间目前是 `open: false`(`lib/rooms.ts`,"待定期")。内容写完、能通过 build
之后,走廊门牌**不会自动打开**——`open` 翻不翻真是单独的、人工做的决定。
