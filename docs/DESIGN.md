# The Sleep Lab — 设计文稿

> willsleep.dev · 2026-07-02 初稿
> 一座夜里才开灯的实验室。每个板块是一个房间,首页是走廊尽头那扇门。

---

## 1. 定位与原则

**这是什么:** 纯个人表达的站点——夜间人格的实验室。放实验、随笔、梦、照片、收藏。

**这不是什么:** 不是作品集,不是给招聘方看的。职业身份在 career.yueqiao.dev(独立仓库),两边刻意解耦。

三条红线:

1. **不放简历式内容。** /about 写的是"站外的我",不出现技能列表、工作经历、项目成就。
2. **通往 career 站的入口只有页脚一条小字链接**,带 UTM 参数(`?utm_source=willsleep.dev&utm_medium=referral&utm_campaign=personal-site`),永远不做 banner / CTA。
3. **宁缺毋滥。** 板块没内容就先不上线入口,不放 "coming soon" 占位页(404 的"没通电"文案除外)。

## 2. 视觉语言

### 色彩

| 用途 | 值 | 说明 |
|---|---|---|
| 基底 | `#000` / near-black `#0a0a0f` | 全站深色,无浅色模式——实验室夜里才开灯 |
| 主强调色 | terminal green(现用 `text-green-500`)| 沿用开场解密文字的绿,全站唯一强调色 |
| 正文 | `white` / `white/70` / `white/40` | 三级灰阶,不引入彩色文字 |

只保留一个强调色。梦境等内容不另设紫色/蓝色主题,靠排版与编号区分,避免视觉噪音。

### 字体(已就位)

- **Lora(serif)** — 长文正文:随笔、梦境记录、about 的叙述段落
- **Geist Sans** — UI 与短文案
- **Geist Mono** — 实验室"仪器感"元素:实验编号、时间戳、导航、EXIF 数据、frontmatter 式元信息

Mono 是这个站的性格担当:凡是"实验室仪表读数"性质的信息一律 mono + 小号 + `white/40`。

### 动效原则

- 仪式感只属于首页。Vortex 开场保留现有行为(3.5s 自动淡出,任意交互可跳过)。
- 子页动效克制:淡入、下划线过渡即可,页面切换要快。
- 全站尊重 `prefers-reduced-motion`:开场动画直接跳过,canvas 实验降级为静态帧 + 手动播放按钮。

### 语言与文风

- 正文**中英混排**,想用哪种写哪种,canonical 版本就是混排原文。
- 装饰性文案(tagline、编号、按钮)保持英文,与 "Living outside the bitmask" 一致。
- 实验室术语体系:实验 `EXP-001`,梦境 `REM-001`,照片按 roll(卷)组织。

## 3. 信息架构与路由

```
/              走廊     现有首页:Vortex 开场 + hero,新增一行 mono 小字导航
/now           值班表   最近在折腾 / 在读 / 在想 / 在听
/lab           实验区   编号实验网格
/lab/[slug]              单个实验,全屏交互
/notes         档案室   随笔 + 梦境记录列表(按年分组)
/notes/[slug]            单篇 MDX 文章
/photos        暗房     摄影瀑布流(图源 Cloudflare R2)
/about         驻留研究员  关于我 + 收藏(书影音/在听/设备)
/zh /en        翻译版   Phase 5,完整翻译的中文版/英文版(见 §7)
404            "This room has no power yet. / 这个房间还没通电。"
```

### 导航

- **首页:** hero 下方一行 mono 小字:`now · lab · notes · photos · about`,`white/40`,hover 变白。不做菜单栏,不破坏"空"。
- **子页:** 统一顶栏一行 mono:左侧 `◂ the sleep lab`(回首页),右侧当前房间名。无汉堡菜单,房间之间经走廊(首页)中转,这本身是设计的一部分。
- **页脚(全站统一):** career 小字链接(仅 willsleep 构建)· RSS · 语言切换(Phase 5)。

## 4. 内容库(content/)

**所有可编辑内容只住 `content/` 一个文件夹**——文字、图片都在里面,页面与组件代码里不写任何文案。改内容永远不需要碰代码。

```
content/
├── now/
│   └── index.md               # 值班表正文
├── about/
│   ├── index.md               # 自述 + 收藏架(frontmatter)
│   └── portrait.jpg
├── lab/
│   └── 001-vortex-field/
│       ├── index.md           # 实验信息面板文字(实验代码在 components/experiments/)
│       └── poster.png
├── notes/
│   └── 2026-07-02-insomnia/   # 一篇文章 = 一个文件夹
│       ├── index.md           # 主文字
│       └── figure-1.jpg       # 随文图,正文里相对引用 ./figure-1.jpg
└── photos/
    ├── 2026-06-hangzhou/      # 一组照片 = 一个文件夹
    │   ├── index.md           # 组说明(可选,没有就是纯图组)
    │   ├── DSCF1234.jpg
    │   └── DSCF1250.jpg
    └── 2026-07-01-moon/       # 单张照片但有额外文字 = 也是一个文件夹
        ├── index.md
        └── DSCF1300.jpg
```

### 约定

1. **文件夹 = 内容单元,文件夹名即 slug**。根部 `index.md` 是主文字;翻译版 `index.zh.md` / `index.en.md` 同居一个文件夹。
2. **图片与文字同居**,正文相对引用(`./figure-1.jpg`),构建时统一改写为 R2 URL(带宽高 + blurhash,防布局跳动)。
3. **photos 的文件夹语义:** 每个子文件夹是一个"组"——一张或多张都行。没有 `index.md` 就是纯图组,标题取文件夹名;有 `index.md` 则正文为组的说明,frontmatter 可对单张图写 caption / 排序:

```yaml
---
title: 杭州,六月
date: 2026-06-30
photos:
  - file: DSCF1234.jpg
    caption: 湖边等末班车
  - file: DSCF1250.jpg
---
这一卷的正文说明(可选)。
```

4. **Git 策略:** markdown 与小插图(notes/about)入库;`content/photos/**` 的照片原图 **gitignore**,它们的家在 R2。R2 不是备份,原片自己另存。
5. **解析方式:** 构建时扫描 `content/`,gray-matter 读 frontmatter,unified/remark 编译 markdown;个别需要交互嵌入的文章可升级为 `.mdx`。没有 CMS、没有数据库,git 历史就是编辑历史。
6. **dev 预览:** 先跑一次图片同步脚本(幂等,见 §6);manifest 里没有的图,dev 模式回落读本地文件。

### 脚手架与校验(第 3 期随解析管线一起交付)

- **`pnpm new:note` / `new:dream` / `new:roll` 脚手架脚本**(`scripts/new-content.mjs`):交互式问一个标题,自动建文件夹(生成规范的 slug 与日期前缀)、写入该类型的 frontmatter 模板。新内容永远从脚本起步,杜绝手写漏字段、slug 命名不一致。
- **构建期 frontmatter 校验**(`lib/content-schema.ts`,zod):每种内容类型一个 schema(note / dream / photo-set / now / about / lab)。解析管线读入任何 `index.md` 都先过校验,**字段错误直接让 `next build` 失败并指出文件与字段**,而不是页面上静默渲染出怪样。schema 即 §5 各房间 frontmatter 约定的唯一权威定义,脚手架模板也从它生成,两处不会漂移。

### / — 走廊

现状保留,仅两处增量:

1. hero 下方加导航一行(见上)。
2. 开场动画状态记入 `sessionStorage`,同一会话内返回首页不再播 Vortex——仪式感一晚一次。

### /now — 值班表

- 一页纸,四个 mono 小节标题:`tinkering` / `reading` / `thinking about` / `listening to`,内容为混排短句列表。
- 顶部一行仪表读数:`last updated: 2026-07-02`。
- 数据源:`content/now/index.md`,更新就是改一个文件。页面本体是 Server Component,构建时静态化。

### /lab — 实验区

- **索引页:** 网格卡片。每卡:`EXP-001`(mono)+ 名称 + 一句话说明 + 日期。缩略图用静态 poster 图(不做 live canvas 预览,首屏性能优先)。
- **详情页 `/lab/[slug]`:** 全屏交互画布。左上角悬浮一枚 mono 徽标:`EXP-001 · vortex field`,hover/点击展开信息面板(这是什么、参数说明、灵感来源),`Esc` 或 `◂` 返回。
- **实验注册表:** 元数据与信息面板文字在 `content/lab/<slug>/index.md`(poster 图同文件夹),`generateStaticParams` 扫描该目录;`lib/experiments.ts` 只做 slug → 实验组件的映射,每个实验是一个 `'use client'` 组件(`components/experiments/`),`next/dynamic` 按需加载。
- **首发三件展品**(现有组件包装):
  - `EXP-001 vortex field` — Vortex,补充可调参数(粒子数、范围)
  - `EXP-002 standing waves` — WavyBackground,可调波速/色相
  - `EXP-003 decryption chamber` — EncryptedText 做成交互版:访客输入自己的文字看加密→解密过程

### /notes — 档案室

- **列表页:** 按年分组的目录。每行:日期(mono)+ 标题 + 类型徽标。两种类型:
  - `note` — 随笔,常规展示
  - `dream` — 梦境记录,编号 `REM-001`,列表里以编号代替日期展示,更像档案
- **文章页:** Lora 正文,行宽 `max-w-prose`,梦境记录顶部多一行仪表读数:`recorded: 07-02 06:41 · lucidity: 2/5`(字段可选)。
- **内容管线:** `content/notes/<slug>/index.md`(文件夹即 slug,见 §4),构建时 gray-matter 读 frontmatter + unified/remark 编译正文;随文图与正文同文件夹,相对引用。frontmatter:

```yaml
---
title: 关于失眠的一个实验
date: 2026-07-02
type: note        # note | dream
summary: 一句话摘要,用于列表与 RSS
lang: mixed        # mixed | zh | en(canonical 的主要语言,供 hreflang 参考)
# dream 专属(可选):
rem: 1             # REM 编号
recorded: 2026-07-02T06:41
lucidity: 2
---
```

- **RSS:** `app/feed.xml/route.ts` 的静态 `GET`(Next 16 静态导出支持 Route Handler 的 GET 构建期产物),只收录 /notes。

### /photos — 暗房

- **索引页:** justified/masonry 瀑布流,黑底,图片带 blurhash 占位淡入。可按 roll(拍摄批次)分组。
- **灯箱:** 点击放大,底部一行 mono EXIF:`X100V · 23mm · f/2 · 1/250 · ISO 640 · 2026-06-30`。左右键切换,`Esc` 关闭。
- **图源:** 全部走 R2 自定义域(建议 `img.willsleep.dev`),GitHub Pages 产物里零图片体积。页面构建时读 `content/image-manifest.json`;roll = `content/photos/` 下的子文件夹名,组说明与 caption 来自各文件夹的 `index.md`(§4)。
- `next/image` 需配 custom loader 才能在 `output: 'export'` 下使用;更简单的方案是直接 `<img srcset>`(manifest 里已有各尺寸 URL),**推荐后者**,少一层抽象。

### /about — 驻留研究员

- 上半:一段混排自述(站外的我:作息、爱好、为什么叫 will sleep)。
- 下半:收藏架,分 shelf 展示:`books` / `films` / `music` / `gear`,每项一行:名称 + 一句话备注,mono 标签。数据源 `content/about/index.md` 的 frontmatter,不接第三方 API,手工维护即可。
- 红线检查:此页任何改动都过一遍 §1 的三条红线。

### 404 — 没通电的房间

- 黑屏中央:`This room has no power yet.` / `这个房间还没通电。`
- mono 小字链接:`◂ back to the corridor`。
- 可选彩蛋:文字用 EncryptedText 渲染,永远解不完。

## 6. 图片同步管线(scripts/sync-images.mjs)

```
content/ 内容库(扫描全部图片:photos/** 为主,notes/about 插图同样处理)
  │  1. iCloud 检查:dataless 文件先 brctl download,超时则跳过并警告
  │     (规避 iCloud Drive 文件被驱逐导致的挂死,见 memory: icloud-drive-build-hazard)
  ├─ 2. sharp:每张导出 webp × [480, 960, 1600, 2400],内容哈希命名
  ├─ 3. blurhash / thumbhash 占位符
  ├─ 4. exiftool 或 sharp metadata 抽取 EXIF(机身/镜头/ISO/光圈/快门/焦距/拍摄时间)
  ├─ 5. 上传 R2:S3 兼容 API(@aws-sdk/client-s3)或 rclone;按内容哈希幂等,已存在即跳过
  │     Cache-Control: public, max-age=31536000, immutable
  └─ 6. 写 content/image-manifest.json 并提交进仓库
```

manifest 条目 schema(`source` 是 content/ 内相对路径,构建时靠它把正文里的相对引用改写成 R2 URL):

```json
{
  "id": "a1b2c3",
  "source": "photos/2026-06-hangzhou/DSCF1234.jpg",
  "roll": "2026-06-hangzhou",
  "takenAt": "2026-06-30T19:42:00+08:00",
  "width": 6240, "height": 4160,
  "blurhash": "LEHV6nWB2yk8...",
  "exif": { "camera": "X100V", "lens": "23mm f/2", "iso": 640, "aperture": 2, "shutter": "1/250", "focal": 23 },
  "sizes": { "480": "https://img.willsleep.dev/a1b2c3-480.webp", "960": "…", "1600": "…", "2400": "…" }
}
```

R2 侧配置:公开 bucket + 自定义域 `img.willsleep.dev`(走 Cloudflare CDN)。密钥放本机环境变量,脚本只在本地跑,不进 CI。

## 7. 多语言规定(canonical / zh / en)

```ts
type Locale = 'canonical' | 'zh' | 'en'
```

### 7.1 三个版本

| 版本 | 路由前缀 | 定义 | `<html lang>` |
|---|---|---|---|
| canonical | 无前缀 | 中英混排原文,**唯一必须存在的版本,唯一的事实来源** | `zh-Hans` |
| zh | `/zh` | 完整中文翻译版 | `zh-Hans` |
| en | `/en` | 完整英文翻译版 | `en` |

铁律:

- canonical 是事实来源,翻译永远可缺、永远可删,反向不成立。
- 路由 slug 永不翻译(`/zh/notes`,不是 `/zh/笔记`)。
- 实验/梦境编号(`EXP-001`、`REM-001`)与 mono 仪表读数在**所有**版本保持英文——它们是仪器读数,不是文案。

### 7.2 路由实现(Next 16 静态导出)

- 双路由树:无前缀树(canonical)+ `app/[locale]` 动态段,`generateStaticParams` 返回 `['zh','en']`,locale 布局校验非法参数出 404。
- 路由文件只是薄壳;页面本体是共享组件(`<NowPage locale={…} />`)。**从第 1 期起,所有页面组件签名就带 `locale` 参数(默认 `'canonical'`)**——第 5 期只加壳,不返工。
- 每条路由在三个版本里都物理存在(回落在构建期完成),语言切换永不 404。

### 7.3 内容解析与回落

- 同文件夹配对(§4):`index.md`(canonical)+ `index.zh.md` + `index.en.md`。
- 请求 zh/en 而翻译文件不存在 → 构建期回落:渲染 canonical 正文 + 顶部一行 mono 标注。zh:`本页暂无中文全译,以下为混排原文`;en:`translation pending — showing the original (mixed)`。
- 无文字内容的单元(纯图组)三版天然相同:不算回落,不出标注。
- **结构性字段只住 canonical 的 frontmatter**(date / type / rem / lucidity / photos 列表等)。翻译文件的 frontmatter 只允许 `title` 与 `summary`,zod 用收紧的 schema 校验翻译文件——两处日期不一致这类漂移在结构上不可能发生。

### 7.4 UI 字典与切换器

- `lib/i18n/strings.ts`,类型化 key,三列取值:canonical 列 = 英文 chrome(§2 "装饰性文案保持英文"),zh 列全中文,en 列全英文。不引 i18n 框架。
- 切换器在页脚,mono 小字:`mixed · 中文 · EN`,链接到当前路径在另一版本中的对应页。
- **不做浏览器语言自动跳转,不存偏好 cookie——URL 即语言。** 静态导出本也做不了服务端跳转,这里明确连客户端跳转也不做。

### 7.5 SEO 规定

- 每页输出 hreflang alternates:`x-default` = canonical,`zh` / `en` 指向对应前缀路径。
- **回落页一律 `noindex`**;只有真实翻译文件存在的 /zh /en 页面才可被收录、才进 sitemap——避免三份重复内容互相稀释。
- RSS 只有 canonical 一份(`/feed.xml`),翻译版不进 feed,订阅者不收重复条目。
- yueqiao 构建不生成 /zh /en 路由树(门控同 §8)。

### 7.6 节奏

翻译是渐进的:允许长期只有部分页面有全译,不为翻译债推迟内容发布。建议顺序:about → now → 置顶的一两篇 note。

## 8. 站点配置清单

| 项 | 方案 |
|---|---|
| metadata | 每页独立 title/description;`metadataBase` 按域名 env 设置;沿用 `METADATA_MAP` 双站模式 |
| OG 图 | 统一品牌图:黑底 + 绿色解密文字风格。`opengraph-image.tsx` 构建期生成,或直接放静态 PNG |
| favicon | 重绘(现在还是 Next 默认):月亮/波形/绿色方块任一,深色可辨 |
| sitemap / robots | `app/sitemap.ts`、`app/robots.ts` 文件约定,构建期静态产出;仅 willsleep 构建收录全部路由 |
| RSS | `app/feed.xml/route.ts`,只喂 /notes |
| 404 | `app/not-found.tsx`,GitHub Pages 用产物 `404.html` |
| trailingSlash | 建议 `trailingSlash: true`,产物变目录 `index.html`,GitHub Pages 上最稳 |
| 统计 | GoatCounter 或不装;无 cookie、无横幅,与"不给招聘方看"的定位一致;绝不上 GA |
| 双站门控 | 新板块全部包在一个 route group 里,layout 里按 `NEXT_PUBLIC_SITE_NAME` 门控:yueqiao 构建渲染占位,不出导航入口 |

### Next 16.2.9 静态导出硬约束(写代码前再读一遍)

- 动态路由**必须** `generateStaticParams`,无 fallback
- 不支持 redirects / rewrites / headers / Server Actions / ISR / cookies
- Route Handler 仅静态 `GET`
- `next/image` 默认 loader 不可用(custom loader 或裸 `<img>`)
- 浏览器 API 只能在 `useEffect` 里碰(构建期会预渲染 Client Component)

## 9. 分期实施

| 期 | 内容 | 完成标准 |
|---|---|---|
| 1 骨架 | 导航、/now、/about、404、favicon、metadata、sitemap/robots、trailingSlash;页面组件签名自带 `locale` 参数(§7.2) | 双域名构建通过;yueqiao 构建不出新板块;红线自查通过 |
| 2 实验区 | /lab 框架 + EXP-001~003(现有组件包装) | 三个实验可全屏交互,信息面板齐全,reduced-motion 降级可用 |
| 3 档案室 | 内容库解析管线(§4)、zod frontmatter 校验、new:note/new:dream/new:roll 脚手架、/notes 列表与文章页、RSS | 发布第一篇 note 与第一条 REM 记录(均由脚手架创建);故意写坏一个字段,构建报错且指明文件;feed.xml 可订阅 |
| 4 暗房 | sync-images 脚本、R2 配置、/photos 页 | 第一卷照片上线;GitHub Pages 产物不含图片;脚本幂等可重跑 |
| 5 翻译版 | /zh /en 路由树、UI 字典、hreflang、页脚切换器(§7) | about + now 有 zh/en 全译;回落页有标注且 noindex;sitemap 只收真实翻译;任意页面三版互切不 404 |

## 10. 组件与素材来源

### 10.1 主源:Aceternity UI

现有组件(Vortex / WavyBackground / EncryptedText / TextRevealCard / MagneticButton)全部来自 Aceternity UI,继续从同一家取货,风格最稳。安装走 `npx shadcn@latest add @aceternity/<name>`,落进 `components/ui/`,与现有模式一致;全部纯客户端组件,静态导出无碍。

**总原则:每个房间最多一个签名效果。** 组件为叙事服务,不为炫技堆叠。

### 落位表

| 房间 | 签名效果 | 组件 | 授权 | 说明 |
|---|---|---|---|---|
| / 走廊 | 已有 Vortex + Wavy | — | — | 不再加任何东西 |
| /now 值班表 | 页首标题行 | **Text Flipping Board** | free | Vestaboard 翻牌显示屏,"值班表/发车牌"的完美实体;`sound: false` |
| /lab 索引 | 网格 hover | **Focus Cards** | free | hover 聚焦一张、其余暗化,像实验室橱窗;备选 Evervault Card(hover 加密字符流,与解密美学同源)二选一 |
| /lab EXP-003 | 输入框 | **Placeholders And Vanish Input** | free | 访客输入 → 文字粒子化消散 → EncryptedText 解密重现,天作之合 |
| /notes 档案室 | 无 | — | — | 阅读优先,纯排版 |
| /photos 暗房 | 灯箱放大镜 | **Lens** | free | 暗房里拿放大镜看底片;索引页只用 blurhash 淡入 |
| /about 研究员 | 开场段落 | **SVG Mask Effect** | free | 鼠标是一束手电筒光,照到哪读到哪;自画像用 **ASCII Art**(free,`animationStyle: "matrix"`) |
| 404 | 背景 | **Shooting Stars / Glowing Stars** | free | 没通电的房间,窗外的夜空 |

### 实验候补(从组件目录直接孵化 EXP)

| 候补 | 组件 | 授权 | 构想 |
|---|---|---|---|
| EXP-004 specimen | Pixelated Canvas | pro | 照片变像素点阵,鼠标 repel/attract/swirl 扰动 |
| EXP-005 the mirror | Webcam Pixel Grid | pro | 访客镜头实时变像素网格(纯本地渲染,进入页面才请求权限,页面上写明不上传) |
| EXP-006 darkroom process | Dither Shader | pro | 实时 ordered dithering,Bayer/halftone 模式,配合摄影主题 |
| 灵感库 | Labs 区(SVG Path Morphing、GTA VI Poster 等) | — | 读源码学手法,自己写变体 |

pro 组件是一次性付费 All-Access;**不必买**——EXP-004 与 EXP-006 用 Paper Shaders(§10.3)的 Image Dithering / Halftone Dots 免费实现,Webcam 像素网格核心是 getUserMedia + canvas 采样,可自己写。

### 明确不用的(及原因)

- **Floating Dock / Navbar 系列** — 设计已定"无全局菜单,房间经走廊中转"(§3)
- **Hero Parallax、Macbook Scroll、Bento Grid、Timeline、Infinite Moving Cards、Testimonials / Pricing / CTA / Logo Clouds、World Map、GitHub Globe** — SaaS 营销页 DNA,违背 §1 定位
- **Aurora / Background Beams / Sparkles / Meteors 等背景类再叠加** — 每页一个签名效果,首页已有 Wavy
- **Canvas Text、Colourful Text、Flip Words** — 多彩,违背单一强调色(§2)
- **Terminal** — 好看但和 Flipping Board 调性重复,/now 只留一个;若日后做"构建日志"彩蛋再启用(`enableSound: false`)

### 接入注意

- canvas / webcam 类一律 `next/dynamic` 按需加载,并做 `prefers-reduced-motion` 降级(§2 动效原则)
- Terminal 与 Text Flipping Board 自带音效,**默认必须关**,尊重访客
- 引入的组件先过一遍配色:默认调色板多为多彩,统一收敛到 白/灰阶 + 终端绿

### 10.2 副源(风格兼容的补充库,按需取件)

| 库 | 授权 | 定位 | 对本站有用的东西 |
|---|---|---|---|
| **React Bits**(reactbits.dev) | MIT + Commons Clause,130+ 组件,TS/Tailwind 变体 | 文字动画与背景效果最全的一家,暗色/科技感组件多 | glitch / 终端 / ASCII 类文字效果做 /lab 实验素材;有些与 Aceternity 重复(如解密文字),重复的以现有为准 |
| **Fancy Components**(fancycomponents.dev) | free & open source | 更玩具向的物理/文字微交互 | Image Trail(鼠标拖出照片轨迹)可做 /photos 索引 hover 或独立 EXP;Gravity 文字可做实验 |
| **Motion Primitives**(motion-primitives.com) | 开源,motion/react 生态 | 克制、精致的过渡与文字组件 | 子页入场淡入、数字滚动这类"不抢戏"的基础动效 |
| **21st.dev** | 聚合市场 | shadcn 风格组件搜索引擎 | 缺什么先来这里搜,不自己造 |

Magic UI 与 Aceternity 高度重叠且更偏 SaaS 营销页,**不列为源**。副源取件同样过 §10.1 的配色收敛与 reduced-motion 降级。

### 10.3 质感层:Paper Shaders(重点推荐)

`@paper-design/shaders-react`,Apache 2.0,零依赖 WebGL shader,极轻量。这是"比普通博客好看"的关键弹药库:

- **Image Dithering / Halftone Dots / Halftone CMYK** — 暗房主题的照片处理效果,直接顶替 Aceternity Pro 的 Dither Shader / Pixelated Canvas(EXP-004、006 免费实现)
- **Grain Gradient / Paper Texture** — 全站质感底噪:极低透明度的颗粒叠层,是"屏幕发光的实验室"和"平板黑背景"的分水岭
- **God Rays / Smoke Ring / Neuro Noise / Metaballs** — /lab 实验现成素材
- **Static Mesh Gradient** — 若某页需要非纯黑背景,用静态版,不引入动画

用法纪律:图像滤镜类进 /photos 与 /lab;全站层面**只允许 Grain 一层**,透明度 ≤ 5%,不与其他背景效果叠加。

### 10.4 动画运行时纪律

- 全站 chrome(导航、过渡、hover)只用 **motion/react**(已安装),保证缓动语言统一
- **GSAP 自 2025 起含全部插件免费**(ScrambleText、SplitText、DrawSVG 等),但只允许进 /lab 单个实验内部,不进全站——两套动画运行时混用会让动效手感分裂
- 页面切换:启用 Next 16 的 **View Transitions**(客户端导航生效,静态导出无碍)做房间↔走廊的轻微交叉淡入;有它没它,是"应用"和"一堆网页"的区别

### 10.5 质感细节清单(不花钱、决定气质的部分)

组件库解决"亮点",这张清单解决"底子"——普通博客和讲究的个人站的差距大半在这里:

- [ ] `::selection` 选中色:终端绿底黑字
- [ ] 滚动条:细、深灰、hover 变绿(仅 WebKit 自定义,Firefox 用 `scrollbar-color`)
- [ ] `:focus-visible` 焦点环:绿色 1px,别用浏览器默认蓝
- [ ] 全站 Grain 叠层(§10.3),透明度 3–5%
- [ ] 排版节奏:正文行高 1.75、段距统一、`max-w-prose`、中英文之间自动留白(考虑 `text-autospace` 或写作时手动)
- [ ] 链接样式全站统一:`underline underline-offset-4` + hover 变绿,不出现三种以上链接样式
- [ ] 空状态与加载态也要设计(照片加载 = blurhash,不出现布局跳动)
- [ ] 暗色 `theme-color` meta,手机浏览器地址栏融入黑底
- [ ] 灵感对照:godly.website、minimal.gallery 里的暗色个人站,发布前拿自己的页面并排比一次

---

*维护备忘:项目在 iCloud Drive 内,构建挂死先查 dataless 文件(`icloud-drive-build-hazard`);node_modules 异常直接重装。*
