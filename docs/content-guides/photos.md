# photos 内容怎么写

跟其他房间不一样,`photos` 不是"写个 frontmatter 就完事"——它有一条完整的图片处理
管线。原图不进 git(体积大),真正被页面读取的是同步脚本生成的
`content/image-manifest.json` + R2 上的四档尺寸文件。

## 文件位置
- `content/photos/<roll>/` —— 每个 roll(一组照片)一个目录,目录名是 roll 的 slug。
- `content/photos/<roll>/index.md` —— **可选**的 roll 元数据(标题/日期/图片顺序)。
  没有这个文件也能显示:roll 标题退化成目录名,图片按文件名字典序排列。
- 该目录下的图片文件本身(`.jpg`/`.jpeg`/`.png`/`.webp`/`.heic`)。
- `content/image-manifest.json` —— **机器生成的产物**,由 `npm run sync:images` 写入,
  不要手动编辑。

## index.md frontmatter 字段(可选文件)
校验走 `lib/content-schema.ts` 的 `photoSetSchema`(zod)。**校验失败会直接抛错、
build 失败**——跟 `now`/`about`/`lab` 的宽容解析不同。

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `title` | string | 否 | roll 标题。不写则用目录名。 |
| `date` | date | 否 | roll 日期,决定在 `/photos` 页面里的排序(有日期的降序在前,没日期的按 slug 字典序排在后面)。 |
| `photos` | array of `{file, caption?}` | 否 | 指定图片显示顺序和说明文字。`file` 必须匹配 `\.(jpe?g|png|webp|heic)$`(大小写不敏感)。列在这里的文件排在前面,目录里其余没登记的图片文件按字典序追加在后。 |

## 示例(反推示例,未实跑)
仓库里现有的 `content/photos/imp/` 只有一张图片、没有 `index.md`,所以下面这份
`index.md` 是根据 schema 反推的最小合法样例,不是从仓库摘的真实文件:

```yaml
---
title: imp
date: 2024-07-16
photos:
  - file: IMG_1940.png
    caption: 第一张
---
```

## 同步管线(把图片从本地弄到线上)
1. 把原图放进 `content/photos/<roll>/`(直接文件,不用先建 `index.md`)。
2. 配置好这五个环境变量(`.env.local`,`npm run sync:images` 会自动加载):
   `R2_ACCOUNT_ID`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`、`R2_BUCKET`、
   `R2_PUBLIC_BASE_URL`。
3. 跑 `npm run sync:images`(想先看看会发生什么、不真的上传,加 `--dry-run`;
   也可以只同步某个 roll:`npm run sync:images -- <roll-name>`)。
4. 脚本做的事:检查 iCloud 文件是否已下载到本地(dataless 会等待物化,超时
   ——默认 15s,`SYNC_ICLOUD_TIMEOUT_MS` 可调——就跳过该文件并打印警告)→ 用
   sharp 生成 480/960/1600/2400 四档 webp → 算 blurhash 占位图 → 提取 EXIF →
   按内容哈希幂等上传到 R2(已存在的 key 直接跳过,不重复上传)→ 把结果写进
   `content/image-manifest.json`。
5. 提交 `content/image-manifest.json` 的改动(它是仓库跟踪的产物,图片二进制本身
   不进 git)。

## 坑
- `index.md` 里的 frontmatter 校验失败(比如 `file` 不是图片扩展名)会让**整个
  build 失败**,不是静默丢弃——这是故意的,单作者站点提前发现拼写错误好过悄悄丢内容。
- 没有 `R2_*` 环境变量时,`npm run sync:images`(非 `--dry-run`)会直接报错退出,
  不写 manifest、不产生任何副作用;想先验证管线跑不跑得通,用 `--dry-run`。
- iCloud 文件如果处于"dataless"(离线)状态,`brctl download` 对孤立文件可能不生效
  ——真正兜底的是超时后跳过该文件,不是这次调用本身生效。见 memory
  `icloud-drive-build-hazard`:开发机重装 node_modules/清缓存后,iCloud 文件可能被
  连带驱逐。
- `getPhotoRolls()` 返回空数组(比如 `content/photos/` 目录整个不存在)时,
  `/photos` 直接 404。

## 上线
`photos` 房间目前是 `open: false`(`lib/rooms.ts`,第 4 期)。就算内容和图片管线都
跑通了,走廊门牌**不会自动打开**——`open` 翻不翻真是单独的、人工做的决定,不是内容
上线的自动结果。
