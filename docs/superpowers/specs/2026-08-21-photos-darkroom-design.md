# /photos 暗房 — 设计文稿
> 2026-08-21 · willsleep.dev (myHomePage) · DESIGN.md §9 期3

## 0. 上位规格与前提

上位规格:[DESIGN.md](../../DESIGN.md) §4(内容库约定)、§5(/photos 章节)、§6(图片同步管线)。冲突时以上位规格为准。

**本次会话确认的两个前提(round 开工前必答项,已答):**

1. **R2 状态:** 尚未配置,用户会后续自行配置(手动走 Cloudflare dashboard),本次不由 Claude 代跑 OAuth/建 bucket。
2. **照片素材:** 暂无真实素材,先用占位图跑通整条管线;真实照片与 R2 凭据都是"用户后续自行补上"的事项,不在本次实现范围内。

这两条前提直接决定了本文档 §4.6 与 §10 的"完成标准"写法:本次交付的是**管线本身**,不是"第一卷照片已上线"这件事——后者依赖用户手上还没有的两样东西(R2 凭据、真实素材),即便管线百分百可用,也无法在本次会话里达成。

## 1. 切片范围

**做:**

- `scripts/sync-images.mjs`:iCloud 检查 → sharp 处理 → blurhash → EXIF 提取 → R2 上传 → 写 `content/image-manifest.json`,幂等
- `lib/content-schema.ts`(新文件):`photoSet` frontmatter 的 zod schema,供 `lib/content.ts` 在读取时校验
- `lib/content.ts`:新增 `PhotoRoll` / `PhotoFrame` 类型 + `getPhotoRolls()` / `getPhotoRoll(slug)`
- `lib/rooms.ts`:`photos` 的 `open` 保持 `false`,直到真实内容上线为止(不在本次范围内翻真,见 §10)
- `app/photos/page.tsx`:瀑布流索引页,按 roll 分组;灯箱同页内嵌(不新增 `[roll]` 路由,理由见 §6.2)
- `.gitignore`:补 `content/photos/**` 图片二进制的忽略规则
- `package.json`:新增依赖(sharp / blurhash / exifr / @aws-sdk/client-s3)与新增 devDependency(vitest,本仓库目前无测试框架)+ `test` script
- `vitest.config.ts`(新文件,最小配置)

**不做:**

- 真正配置 R2(bucket / 自定义域 / API token)——用户自行在 Cloudflare dashboard 完成,本文档 §5 只给步骤清单
- 上传任何真实照片——用占位图验证管线,真实上传是用户配好 R2 后自己在本机跑脚本的事
- `content/notes/**`、`content/about/**` 插图纳入同步脚本扫描范围——DESIGN §6 的流程图把 notes/about 插图也画了进去,但 notes 房间(期4)还不存在,about 的 `portrait.jpg` 是入库的本地小图(DESIGN §4 约定 4),不走 R2。本期脚本只扫 `content/photos/**`,以后 notes 插图要接入时只是加一行 glob,不是重新设计
- `pnpm new:roll` 脚手架脚本——BUILD-LOG.md 期3 开工 prompt 明确只列了 sync-images.mjs / R2 配置 / /photos 页面 / manifest 写入四项;`new:note`/`new:dream`/`new:incident`/`new:roll` 四个脚手架被 BUILD-LOG 期4 开工 prompt 归在一起,本期不提前做一个、留另外三个半吊子。本期新增照片组文件夹靠手动创建 + zod 校验兜底
- `next/image` custom loader——DESIGN §5 已经把这个方案否决掉("推荐" `<img srcset>`),不重新讨论

**完成标准(区分"管线完成"与"内容上线",呼应 §0 的前提说明):**

- 管线完成:`scripts/sync-images.mjs --dry-run` 对占位图跑通全部阶段(iCloud 检查、resize、blurhash、EXIF 提取、manifest 结构预览)且无报错;单元测试覆盖 manifest 生成与 frontmatter 校验的关键分支;`/photos` 页面在 `next dev` 下能通过本地回落(§6.4)看到占位图的瀑布流与灯箱效果;`npx tsc --noEmit` / `eslint` / `pnpm build:willsleep` 通过(GitHub Pages 产物不含图片二进制)
- 内容上线(不在本次范围,留给用户后续操作):用户配好 R2 凭据 → 放入真实素材 → 跑 `pnpm sync:images`(无 `--dry-run`)→ 真正产出 `content/image-manifest.json` 并提交 → `lib/rooms.ts` 里 `photos` 的 `open` 翻为 `true`

## 2. 内容库约定(复述 DESIGN §4,不重新决定)

```
content/photos/
├── 2026-06-hangzhou/          # 一组照片 = 一个文件夹,文件夹名 = slug = roll id
│   ├── index.md                # 可选:组说明 + frontmatter(caption/排序)
│   ├── DSCF1234.jpg
│   └── DSCF1250.jpg
└── 2026-07-01-moon/
    ├── index.md
    └── DSCF1300.jpg
```

- 没有 `index.md` = 纯图组,标题取文件夹名,帧按文件名字典序排列。
- 有 `index.md`:frontmatter 的 `photos` 数组如果存在,数组顺序即渲染顺序(覆盖字典序);未在数组里出现的图片文件仍会被扫描进 manifest,但排在数组内条目之后(字典序),避免"忘记在 frontmatter 里登记"导致图片彻底消失(呼应"宁缺毋滥"不等于"悄悄丢数据")。
- 图片二进制 gitignore,`index.md`/`index.zh.md`/`index.en.md` 入库(DESIGN §4 约定 4)。

## 3. 两个 schema:`photoSet` frontmatter 与 `image-manifest.json` 条目

这两个 schema 服务不同的读取路径,不要混用:§3.1 校验的是 `content/photos/<roll>/index.md` 的 frontmatter(人写的);§3.2 是 `sync-images.mjs` 生成、`getPhotoRolls()` 读取的 `content/image-manifest.json` 条目(机器写的)。后续 §4/§6 引用"manifest 条目"一律指向 §3.2,引用"frontmatter"一律指向 §3.1。

### 3.1 `photoSet` frontmatter schema(`lib/content-schema.ts`)

```ts
import { z } from "zod";

export const photoSetSchema = z.object({
  title: z.string().trim().min(1).optional(),
  date: z.coerce.date().optional(),
  photos: z
    .array(
      z.object({
        file: z
          .string()
          .trim()
          .min(1)
          .regex(/\.(jpe?g|png|webp|heic)$/i, "file 必须是图片文件名(jpg/jpeg/png/webp/heic)"),
        caption: z.string().optional(),
      })
    )
    .optional(),
});

export type PhotoSetFrontmatter = z.infer<typeof photoSetSchema>;
```

**校验时机与失败行为:** `lib/content.ts` 的 `getPhotoRolls()` / `getPhotoRoll()` 读到某个 roll 的 `index.md` 后,用 `photoSetSchema.safeParse(data)` 校验;失败时 `throw`(不是静默跳过、也不是 `console.warn` 完事)——`next build` 因此直接失败,错误信息里带上 zod 的 `error.issues`(包含字段路径)与该 roll 的文件夹名,满足 DESIGN §4"字段错误直接让 next build 失败并指出文件与字段"的要求。`getPhotoRolls()` 在 `next dev` 下同样会抛错(不做 dev/prod 两套校验行为,校验规则本身没有环境分支——环境分支只存在于§6.4 的图片来源回落,不存在于 frontmatter 校验)。

这是本仓库第一个 `lib/content-schema.ts` 文件与第一个 zod 依赖;`now`/`about`/`lab` 现有的 ad hoc 手写校验(`lib/content.ts` 里那些 `typeof x === "string" ? x : ...`)本次不回头重构——DESIGN §4 说全量 schema(note/dream/incident/photo-set/now/about/lab)最终都要搬进这个文件,但那是随期4 一起做的事,本次只加 `photoSet` 一个。

### 3.2 `image-manifest.json` 条目 schema

`content/image-manifest.json` 是一个以 `source`(`content/` 内相对路径)为 key 的对象,由 `scripts/sync-images.mjs` 独占写入(§4.6),`lib/content.ts` 只读:

```ts
export type ManifestExif = {
  camera?: string; lens?: string; iso?: number;
  aperture?: number; shutter?: string; focal?: number;
};

export type ManifestEntry = {
  id: string;                                            // 内容哈希(§4.3)
  roll: string;                                          // 所属文件夹名
  takenAt: string | null;                                // ISO,回落链见 §4.5
  width: number; height: number;                         // 原图尺寸
  blurhash: string | null;                                // 原始 blurhash 字符串
  blurDataUrl: string | null;                             // 预渲染的小尺寸 PNG data URL,见 §4.4
  exif: ManifestExif | null;
  sizes: Partial<Record<"480" | "960" | "1600" | "2400", string>>; // 见 §4.3 的"全跳过则不写条目"规则,这里不会是空对象
};

export type ImageManifest = Record<string, ManifestEntry>; // key = "photos/<roll>/<file>"
```

`blurhash` 与 `blurDataUrl` 两个字段都保留:前者是 DESIGN §6 原文明确要求的字段(留作以后可能的客户端重新解码用途),后者是本文档新增的、`/photos` 页面实际渲染时用的成品(§4.4 说明生成方式,§6.1 说明为什么不在 `lib/content.ts` 里现算)。

## 4. `scripts/sync-images.mjs` 流水线

### 4.1 CLI 与环境变量

```
pnpm sync:images [--dry-run] [roll-slug ...]
```

- 不带位置参数:扫描 `content/photos/` 下全部子文件夹。
- 带位置参数:只处理指定的 roll(方便调试单个文件夹,不必每次全量重跑——虽然幂等让全量重跑本身很便宜,但调试时想看单个 roll 的详细日志)。
- `--dry-run`:跑完 iCloud 检查 / resize / blurhash / EXIF 全部阶段,但跳过 R2 上传与 manifest 写入。**幂等信号的来源:** dry-run 会只读地打开现有 `content/image-manifest.json`(不存在则视为空),对每个候选文件计算内容哈希(§4.3)后与 manifest 里同 `source` key 的 `id` 比对——哈希相同则打印 `= <path>: already in manifest, would skip`,不同或不存在则打印 `+ <path>: would process & upload`。因为 dry-run 从不写任何文件,只要两次运行之间输入不变,两次的 `would skip`/`would process` 分类逐行相同——这就是不需要真实 R2 凭据也能验证的幂等信号(§10 用这条断言)。**没有 R2 凭据时,`--dry-run` 是唯一能跑的模式**——见 §4.6。

环境变量(全部本机 `.env.local`,不进 CI,`.env*` 已被 `.gitignore` 覆盖):

| 变量 | 用途 |
|---|---|
| `R2_ACCOUNT_ID` | Cloudflare 账号 ID |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 API Token(§5 步骤生成) |
| `R2_BUCKET` | bucket 名 |
| `R2_PUBLIC_BASE_URL` | 公开访问域,如 `https://img.willsleep.dev` |
| `SYNC_ICLOUD_TIMEOUT_MS` | 可选,默认 `15000`,见 §4.2 |

### 4.2 iCloud dataless 检测与降级

呼应 memory `icloud-drive-build-hazard`:`brctl download` 对孤立(orphaned)文件不生效,真正兜底的是"超时就跳过",不是这个调用本身。

```
对每个候选图片文件:
  1. 执行 `ls -lO <path>`,输出里出现 "dataless" 视为未下载
  2. 若 dataless:执行 `brctl download <path>`(不等待其返回,fire-and-forget)
  3. 每 500ms 重新检查一次 dataless 标志,直到清除或超过 SYNC_ICLOUD_TIMEOUT_MS
  4. 超时仍 dataless:打印 `⚠ skipped <path>: still dataless after <N>ms (see memory icloud-drive-build-hazard — orphaned iCloud files may need re-download from another device)`,跳过该文件(不计入本次 manifest 更新,不中断脚本),继续下一个文件
```

纯字符串匹配的 `isDataless(lsOutput)` 与轮询循环 `waitForMaterialize(path, { timeoutMs, pollMs, checkFn })` 各自独立导出,轮询函数的 `checkFn`/时钟可注入——这是 §8 单元测试能不碰真实 iCloud 文件系统的前提。

### 4.3 图片处理(sharp)

- 尺寸阶梯沿用 DESIGN §6 示例:`[480, 960, 1600, 2400]`,webp,quality 82。
- **不放大:** 若原图宽度小于某档,跳过该档(`sizes` 里没有这个 key),不做插值放大出虚假清晰度。
- **边界情况——原图窄于 480px(全部四档都被跳过):** 不写这张图的 manifest 条目(等同"从未同步"),打印一行警告 `⚠ skipped <path>: narrower than smallest tier (480px), nothing to serve`。真实照片(手机/相机原图)几乎不会触发,但占位图测试容易撞上;这样处理让 §3.2 的 `sizes` 永远不必是空对象 `{}`,前端(§6.3/§6.4)也就不需要单独区分"空对象"和"完全不在 manifest 里"这两种状态——统一按"不在 manifest 里"处理即可。
- **文件名:** 内容哈希(sha256 前 10 位 hex)+ 宽度,如 `a1b2c3d4e5-960.webp`,天然幂等(同内容永远同名,重跑时对已存在的 key 跳过上传,见 §4.6)。
- `id` 字段 = 该内容哈希(不含宽度后缀部分),同一原图的四个尺寸共享同一个 `id`。

### 4.4 blurhash 与 `blurDataUrl`

两步,都在 sync 脚本里做,只做一次(不是每次 `next build`/`next dev` 重算):

1. 用 `blurhash` 包的 `encode()`,从原图缩到窄边约 32px 的原始像素数据编码出 `blurhash` 字符串。
2. 立刻用 `blurhash` 包的 `decode()` 把这个字符串解回一个固定小尺寸(如 32×32)的原始 RGBA 像素 buffer,再用已经引入的 `sharp`(`sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer()`)把这个 buffer 编码成一张真正的 PNG,base64 后拼成 `data:image/png;base64,...` 存进 `blurDataUrl`。**不额外引入 canvas 依赖**——`sharp` 本来就在依赖列表里,原始像素转 PNG 是它的标准能力。

失败(极少数格式不支持编码)时 `blurhash`/`blurDataUrl` 两个字段都为 `null`,不是让整个脚本挂掉。`lib/content.ts` 只是把 manifest 里已经算好的 `blurDataUrl` 原样传给 `PhotoFrame`(§6.1 说明为什么不在读取层重算)。

### 4.5 EXIF 提取(`exifr`)与 `takenAt` 回落

选 `exifr`(纯 JS)而不是 shell 出去调系统 `exiftool` 二进制:不给本机环境再加一个"有没有装某个命令行工具"的隐性依赖,复现性更好(呼应 §4.2 的 iCloud 教训——外部工具的可用性假设是这个仓库吃过亏的地方)。

- 能解出 EXIF:`{ camera, lens, iso, aperture, shutter, focal }`,各字段本身也允许为 `undefined`(不是每张图都有完整字段)。
- 解不出(占位图 / 没有 EXIF 的截图):`exif` 字段整体为 `null`,不是塞一个全 `undefined` 的空壳对象。
- `takenAt` 回落链:EXIF `DateTimeOriginal` → 该 roll `index.md` frontmatter 的 `date`(§3.1 schema)→ 文件系统 mtime → `null`。三层都拿不到时,前端不渲染日期,不是显示"1970-01-01"这种假数据。

### 4.6 R2 上传与凭据缺失时的行为

**核心原则(呼应仓库既有的"不许假"风格,`lib/content.ts` 里"读不到就返回 null"的同一套哲学):没有真实凭据,就不写会指向不存在资源的 `image-manifest.json`。**

```
启动时检查 R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET / R2_PUBLIC_BASE_URL:
  - 全部存在 且 非 --dry-run:走真实上传路径(见下)
  - 缺任意一个 且 非 --dry-run:打印清晰的错误块(缺了哪几个变量、指向 §5 的配置步骤),
    以非零退出码结束,不写 manifest、不产生任何副作用
  - --dry-run(无论凭据是否存在):跳过上传与 manifest 写入,只打印"本该写入的 manifest 条目"到 stdout,
    用于验证 resize/blurhash/EXIF 各阶段的输出是否合理
```

真实上传路径(`@aws-sdk/client-s3`,R2 的 S3 兼容 API):

1. `HeadObjectCommand` 检查该 key(内容哈希+宽度)是否已存在于 bucket——存在则跳过,这是幂等的实际实现方式(不是"本地记录一份哈希清单",是直接问 R2 权威状态,重跑脚本时哪怕本地 manifest 丢了也不会重复上传)。
2. 不存在则 `PutObjectCommand` 上传,`CacheControl: "public, max-age=31536000, immutable"`(DESIGN §6 原文要求)。
3. 全部四档尺寸都处理完后,合并写入 `content/image-manifest.json`(§3.2 结构,以 `source` 相对路径为 key)——**是合并不是覆盖**:已存在于 manifest 但这次没有被扫描到的条目(比如某个 roll 文件夹被删掉了)保留不动,脚本不负责清理陈旧条目(避免因为一次跑漏了某个 iCloud 文件就把 manifest 里的历史记录冲掉)。

### 4.7 幂等性(验收口径)

对同一批文件(内容不变)连续跑两次 `pnpm sync:images`:第二次应该零上传(`HeadObjectCommand` 全部命中已存在)、`content/image-manifest.json` 字节级不变。这是 §10 验收清单的一条,也是 §8 要写测试的一条。

## 5. R2 配置步骤清单(用户自行操作,本次不代跑)

供你后续在 Cloudflare dashboard 里照做,不需要 Claude 参与:

1. **建 bucket:** Cloudflare dashboard → R2 → Create bucket,建议命名 `willsleep-photos`(公开可读)。
2. **开公开访问:** bucket 设置里启用 public access,或走自定义域(下一步)间接公开。
3. **绑自定义域:** bucket 设置 → Custom Domains → 添加 `img.willsleep.dev`(需要该域名已经在同一个 Cloudflare 账号下托管 DNS)。
4. **生成 API Token:** R2 → Manage R2 API Tokens → Create API Token,权限选 "Object Read & Write",作用域限定到这一个 bucket(不要给全账号权限)。拿到 `Access Key ID` / `Secret Access Key`。
5. **本机环境变量:** 在仓库根目录建 `.env.local`(已被 `.gitignore` 的 `.env*` 规则覆盖,不会入库),填入 §4.1 表格里的五个变量。`R2_ACCOUNT_ID` 在 dashboard 右侧栏能直接看到。
6. **验证:** 跑 `pnpm sync:images --dry-run` 确认脚本能读到环境变量(dry-run 模式即使凭据缺失也能跑,但可以在日志里加一行"凭据检测:OK/缺失"帮你确认);凭据配好后去掉 `--dry-run` 跑一次真实小批量(建议先放 1-2 张测试图到 `content/photos/test-roll/`),检查 `img.willsleep.dev` 是否能直接访问上传后的 URL。

## 6. `/photos` 页面实现

### 6.1 索引页(`app/photos/page.tsx`)

- `getPhotoRolls()` 按日期降序排列(无日期的排最后,与站内其他列表"新的在前"的一致习惯对齐,虽然 DESIGN 没有为 /photos 明写这条,但 `/notes` 规格与既有站点习惯都是如此,不另立新规则)。
- 瀑布流:CSS 多栏(`columns-2 md:columns-3 gap-2`,每张图 `break-inside-avoid`),不引入 masonry/justified 布局库——DESIGN §5 已经为图片加载方式定了"少一层抽象"的调子(`<img srcset>` 优于自定义 loader),这里延续同一判断。
- 每张图 `<img>` 用 `srcset` 拼出 `sizes` 里实际存在的档位(§4.3 提到不放大、可能缺高档),`sizes` 属性给出响应式提示;占位用 `PhotoFrame.blurDataUrl` 直接当 `background-image`——这个值是 §4.4 在 sync 脚本里预先算好、存进 manifest 的成品 PNG data URL,页面渲染时不再解码 blurhash、不需要客户端 JS 或运行时 canvas,`lib/content.ts` 只是透传。

- 按 roll 分组展示:每组一个小标题(roll 的 `title` 或 slug)+ 该组的瀑布流子区块。

### 6.2 灯箱

同页内嵌(不做 `/photos/[roll]` 独立路由,静态导出下每个 roll 一个路由会让"新增一个 roll 就多一条路径"变成一种日常噪音,而灯箱本来就该是覆盖层交互,不是导航层级)。

- 点击任意帧 → 全屏覆盖层,`Esc` 关闭,`←`/`→` 在**当前 roll 内**的帧之间切换(跨 roll 切换不做,灯箱语义是"看这一组",不是"看全站")。
- 底部一行 mono EXIF:`X100V · 23mm · f/2 · 1/250 · ISO 640 · 2026-06-30`(DESIGN §5 原文格式)。**字段缺失时优雅省略该片段**,不是显示"unknown"——比如占位图没有 EXIF 时,这一行可能只剩日期,甚至整行为空时不渲染这个 mono 行。用 `·` 分隔符只在相邻两个字段都存在时才插入,不留悬空的 `· ·`。
- 手写实现,不引入轮播库(灯箱逻辑量不大:一个当前 index 状态 + 键盘事件监听)。

### 6.3 `PhotoFrame` 渲染类型(`lib/content.ts`)

```ts
export type PhotoExif = {
  camera?: string; lens?: string; iso?: number;
  aperture?: number; shutter?: string; focal?: number;
};

export type PhotoFrame = {
  file: string;               // 文件夹内的原始文件名,如 "DSCF1234.jpg"
  sizes: Partial<Record<"480" | "960" | "1600" | "2400", string>> | null;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null; // 从 manifest(§3.2)透传,由 sync 脚本预先生成,见 §4.4
  takenAt: string | null;
  exif: PhotoExif | null;
  caption?: string;
};

export type PhotoRoll = {
  slug: string;
  title: string;
  date: string | null;
  paragraphs: string[];       // 组说明正文,复用 content.ts 现有的 toParagraphs()
  frames: PhotoFrame[];
};

export function getPhotoRolls(): PhotoRoll[];
export function getPhotoRoll(slug: string): PhotoRoll | null;
```

`sizes` 为 `null`(该文件完全不在 manifest 里,即从未同步过,含 §4.3 的"窄于 480px"边界情况)时的行为按 §6.4 环境分支处理,不在这里写死。

**`getPhotoRolls()` / `getPhotoRoll(slug)` 装配步骤**(`lib/content.ts` 里第一个需要"扫目录 + 外部文件 join"的函数,不同于该文件现有函数只读单个 `index.md`——因此在这里把步骤完整摊开,不留给实现阶段推断):

```
1. fs.readdirSync("content/photos") 拿到全部 roll 文件夹名(即 slug)
2. 对每个 roll:
   a. 若存在 index.md:gray-matter 读 frontmatter,photoSetSchema.safeParse 校验(失败见 §3.1),
      取 title(缺省用 slug)、date、正文转 paragraphs(复用现有 toParagraphs())
   b. 若不存在 index.md:title = slug,date = null,paragraphs = []
   c. 确定该 roll 下的图片文件顺序:frontmatter 里 photos[] 数组按其顺序在前;
      该文件夹里存在但没出现在 photos[] 里的图片文件按文件名字典序追加在后(§2 规则)
   d. 对每个文件:用 `photos/<roll>/<file>` 去查 image-manifest.json(§3.2)
      - 命中:按命中条目 + frontmatter 里该文件对应的 caption(若有)组出 PhotoFrame,sizes 为
        manifest 里的真实 R2 URL
      - 未命中:按 §6.4 环境分支处理(dev 走本地回落;production 整帧从 frames 剔除)
3. 按 date 降序排列全部 roll(无 date 的排最后,§6.1)
4. getPhotoRoll(slug) 是 getPhotoRolls() 按 slug 过滤后取一条,找不到返回 null
```

### 6.4 dev 模式本地回落(DESIGN §4.6 既有约定的具体实现)

**只影响 `next dev`,静态导出(`next build`)下没有这套逻辑,生产产物永远只从 manifest 读真实 R2 URL。**

- `getPhotoRolls()` 在 `process.env.NODE_ENV !== "production"` 时,对 manifest 里找不到的帧:
  1. 惰性创建一个符号链接 `public/_dev-photos -> ../content/photos`(仅在符号链接不存在时创建一次,失败静默忽略——比如只读文件系统,此时该帧退化为下一条的"生产行为");
  2. 若符号链接创建成功:该帧的 `sizes` 全部四档都指向同一个 `/_dev-photos/<roll>/<file>` 路径(dev 预览不需要真的有响应式档位),`width`/`height` 用 `sharp(...).metadata()` 现读(本地文件,开销可接受),`blurDataUrl`/`exif`/`takenAt` 为 `null`(dev 回落只保证"能看到图",不重新实现一遍 §4.3-4.5 的处理管线)。
- **生产构建**(`NODE_ENV === "production"`)下,manifest 里没有的帧直接从 `frames` 数组里剔除,不渲染、不报错——与 `getRoomStatuses()` 现有的"没数据就 null,门缝读数整段省略"是同一种"宁缺毋滥"处理,不是新发明一种半成品状态。

`public/_dev-photos` 加入 `.gitignore`(符号链接本身不该入库)。

## 7. `.gitignore` 变更

```gitignore
# content/photos 原图 gitignore,家在 R2(DESIGN §4 约定 4)——
# 但组说明/翻译 markdown 要入库
content/photos/**/*
!content/photos/**/
!content/photos/**/index.md
!content/photos/**/index.zh.md
!content/photos/**/index.en.md

# dev 模式本地图片回落用的符号链接(§6.4)
/public/_dev-photos
```

`content/image-manifest.json` 不在忽略范围内,照常入库(DESIGN §6 原文:"写 content/image-manifest.json 并提交进仓库")。

## 8. 测试策略(TDD 范围,超参数化实现前先写测试)

本仓库目前没有测试框架,本次引入 `vitest`(ESM 原生、启动快、和 Next 16 项目摩擦小)作为 devDependency,新增 `vitest.config.ts`(最小配置,`test` 目录或 `*.test.ts` 就近放在被测文件旁边,与 `lib/`、`scripts/` 同级)。

覆盖范围(对应 BUILD-LOG.md 期3 开工 prompt 里点名的"尤其是 manifest 生成与 frontmatter 校验逻辑"):

- **`photoSetSchema`(§3.1):** 合法 frontmatter 通过;`photos[].file` 缺失/非图片扩展名/空字符串时 `safeParse` 失败且 `issues` 指向正确字段路径;`date` 非法日期字符串时失败;整个 frontmatter 为空对象时合法(纯图组允许没有任何字段)。
- **`isDataless` / `waitForMaterialize`(§4.2):** 纯字符串匹配的 `isDataless(lsOutput)` 直接单测;`waitForMaterialize` 用可注入的假时钟 + 假 `checkFn`(不碰真实文件系统、不真的等 15 秒),验证"超时后返回 skipped 状态而不是抛异常或挂起"。
- **manifest 条目构建(§4.3-4.5):** 给定 mock 的 sharp 输出(宽高、resize 结果)与 mock 的 exifr 输出,验证 `id` 是内容哈希、`sizes` 正确跳过小于原图的档位、`exif` 为 `null` 而非空对象、`takenAt` 回落链三层依次验证。
- **R2 上传幂等(§4.6):** 注入 mock 的 S3 client(`HeadObjectCommand` 返回"已存在" vs "不存在"两种场景),验证已存在时不调用 `PutObjectCommand`,不存在时调用且参数(key/bucket/CacheControl)正确。
- **`getPhotoRolls()`/`getPhotoRoll()`(§6.3-6.4):** 用临时 fixture 目录(`content/photos/` 的最小样例 + 一份 fixture manifest.json),验证:manifest 命中的帧渲染真实 R2 URL;生产模式下 manifest 缺失的帧被剔除;dev 模式下缺失的帧走本地回落分支(mock `NODE_ENV`,不真的依赖符号链接创建成功与否,这部分测创建失败时的静默降级路径)。
- **幂等性集成检查(§4.7):** 可以是一条更高层的测试或手动验收步骤(见 §10)——对同一份 fixture 连续跑两次核心流水线函数,断言第二次的"待上传"列表为空。

## 9. 依赖变更

新增 `dependencies`:`sharp`、`blurhash`、`exifr`、`@aws-sdk/client-s3`、`zod`。
新增 `devDependencies`:`vitest`。
`package.json` 新增 scripts:

```json
{
  "sync:images": "node scripts/sync-images.mjs",
  "test": "vitest run"
}
```

## 10. 验收清单

- [ ] `npx tsc --noEmit` 通过
- [ ] `pnpm lint` 通过
- [ ] `pnpm test` 通过(§8 全部用例)
- [ ] `pnpm sync:images --dry-run` 对 `content/photos/` 下的占位图跑通全部阶段,无报错,stdout 打印出合理的 manifest 条目预览
- [ ] 无 R2 凭据时,`pnpm sync:images`(不带 `--dry-run`)以非零退出码失败,并打印指向 §5 的清晰提示,不写 `image-manifest.json`
- [ ] `next dev` 下 `/photos` 能看到占位图的瀑布流与灯箱效果(走 §6.4 本地回落),灯箱键盘导航(`Esc`/`←`/`→`)与 EXIF 行的字段缺失省略均可交互验证
- [ ] `pnpm build:willsleep` 通过,产物(`out/`)不含任何 `content/photos/` 下的图片二进制
- [ ] `pnpm build:yueqiao` 通过,`/photos` 路由不出现在 yueqiao 产物里(双站门控,同现有房间模式)
- [ ] 幂等性:对不变的输入连续跑两次 `pnpm sync:images --dry-run`,两次的 `would skip` / `would process` 分类逐行相同(§4.1 的内容哈希 vs. 现有 manifest 比对机制,不接触真实 R2 也能验证)
- [ ] `content/image-manifest.json` 结构与 §3.2 一致,`lib/content.ts` 的 `getPhotoRolls()` 能正确解析(用真实跑过一遍 dry-run 产出的样例条目做人工核对)

**明确不在本次验收范围内(见 §0/§1 的前提说明):** "第一卷照片上线"、`lib/rooms.ts` 里 `photos.open` 翻真——这两项等用户配好 R2 并放入真实素材后才能达成,不属于本次编码工作可以自行验证的东西。

## 11. 与 DESIGN.md / BUILD-LOG.md 的同步

完成实现后需要回写的地方(留到 §finishing 阶段做,不在写 spec 这一步做):

- `DESIGN.md` §9 期3 完成标准:三条("第一卷照片上线;GitHub Pages 产物不含图片;脚本幂等可重跑")里,"GitHub Pages 产物不含图片"与"脚本幂等可重跑"本次可以打勾;"第一卷照片上线"暂不打勾,旁注一句说明原因(等用户配 R2 + 传真实素材)。
- `BUILD-LOG.md` 期3 状态行:`spec`/`plan`/`build` 打勾,`merge` 视合并情况而定;备注栏说明"管线已交付,内容上线等用户完成 R2 配置"。
- `DESIGN.md` §4"脚手架与校验"小节标题仍写着"(第 3 期随解析管线一起交付)"——这是 2026-08-22 期3/期4 对调前的残留(彼时 /notes 才是期3),对调时 §9 表格下方加了修订说明,但这一处小节标题漏改。顺手把它改成"(第 4 期随解析管线一起交付)",与 §9 表格保持一致——本次只交付其中 `photoSet` 一个 schema(§3.1),标题描述的仍是完整的脚手架+全量校验系统,归期4没有变。
- `lib/content.ts` 文件头注释"通用解析管线、zod 校验...仍在第 3 期"同样是对调前的残留,一并改成"第 4 期"。
