# 组件来源目录快照

> willsleep.dev · 2026-07-05 实抓
> 五家来源的完整组件清单,供开发时翻仓取件。**本文档只是库存目录,不是决策记录**——用什么、怎么用,以 [DESIGN.md](DESIGN.md) §2(动效四层预算)、§5 /lab(策展三问:组件是仪器不是展品)、§10.1(**签名账本**——额度以路由段计,不在账本里的效果不许存在)与配色收敛为准。
>
> 标记说明:✅ 已在用 · 📌 已进签名账本 · 🚫 已明确不用 · 💰 Pro 付费

---

## 1. Aceternity UI(主源)

- **地址:** ui.aceternity.com · **安装:** `npx shadcn@latest add @aceternity/<name>` → `components/ui/`
- **授权:** 单组件大多免费;标 💰 者及全部 Blocks(Hero/Pricing/FAQ 等营销区块,本站无用)需 All-Access 一次性付费
- **依赖:** motion/react + Tailwind,与本仓库现状一致

### Backgrounds & Effects
Webcam Pixel Grid 💰 · Images Badge · Parallax Hero Images 🚫 · Scales · Dotted Glow Background 💰 · Background Ripple Effect · Sparkles 🚫 · Background Gradient · Gradient Animation · **Wavy Background ✅(走廊的灯)** · Background Boxes · Background Beams 🚫 · Background Beams With Collision 🚫 · Background Lines · Aurora Background 🚫 · Meteors 🚫 · Glowing Stars · Shooting Stars · **Vortex ✅(开场仪式)** · Spotlight / Spotlight New · Canvas Reveal Effect · **SVG Mask Effect ✅手法(/about 手电筒:未装组件,取其蒙版手法自写 radial-gradient 版)** · Tracing Beam · Lamp Effect · Grid and Dot Backgrounds · Glowing Effect · Google Gemini Effect 🚫

### Card Components
Keyboard · Terminal(备用:构建日志彩蛋,`enableSound: false`)· Tooltip Card · **ASCII Art 📌(/about 自画像,静态印版,不用 matrix 动画)** · Pixelated Canvas 💰(仪器备料)· 3D Card Effect · Evervault Card(曾为 /lab 索引备选)· Card Stack · Card Hover Effect · Wobble Card · Expandable Card · Card Spotlight · **Focus Cards 📌(/lab 索引 hover)** · Infinite Moving Cards 🚫 · Draggable Card · Comet Card · Glare Card · Direction Aware Hover

### Text Components
Canvas Text 💰🚫(多彩)· **Encrypted Text ✅(开场句;EXP-003 反转用)** · Layout Text Flip · Colourful Text 🚫 · Squiggly Text · Text Generate Effect · Typewriter Effect · Flip Words 🚫 · Text Hover Effect · Container Text Flip · Hero Highlight · **Text Reveal Card ✅(仓库内,未落位)** · **Text Flipping Board 🚫(/now 曾落位,2026-07-28 账本否决;退回仪器备料)**

### Inputs / Buttons / Cursor / 其他
**Placeholders And Vanish Input 📌(EXP-003 dream decay 输入)** · Gooey Input · File Upload · Signup Form 🚫 · **Magnetic Button ✅(仓库内,当前未使用)** · Noise Background · Hover Border Gradient · Moving Border · Stateful Button · Multi Step Loader · Loader · Following Pointer · Pointer Highlight · **Lens 📌(/photos 灯箱放大镜)** · Dither Shader 💰(仪器备料,Paper Shaders 免费替代)· Animated Modal · Animated Tooltip · Link Preview

### 整类不用 🚫
Navigation 全类(Floating Dock / Navbar 等——本站无全局菜单)· Scroll & Parallax 全类(Macbook Scroll / Hero Parallax 等)· Carousels 全类 · Layout & Grid(Bento 等)· Data & Visualization(Globe / World Map / Timeline)· 3D 全类 · Blocks 全部(SaaS 营销区块)

---

## 2. React Bits(副源:文字动画与背景最全)

- **地址:** reactbits.dev · **授权:** MIT + Commons Clause(可用于本站,不可转卖组件本身)
- **形态:** 130+ 组件,每个有 JS/TS × CSS/Tailwind 四种变体,复制粘贴式
- **对本站:** 暗色/科技感素材库,主要往 /lab 送仪器;取件先过配色收敛(多彩默认 → 白/灰 + 终端绿)

### Text Animations(27)
split-text · blur-text · circular-text · text-type · shuffle · shiny-text · text-pressure · curved-loop · **fuzzy-text**(信号退化感)· gradient-text 🚫 · falling-text · text-cursor · **decrypted-text**(与已有 EncryptedText 重复,以现有为准)· true-focus · scroll-float · scroll-reveal · **ascii-text** · **scrambled-text** · rotating-text · **glitch-text** · scroll-velocity · variable-proximity · count-up

### Animations(35)
animated-content · fade-content · electric-border · orbit-images · **pixel-transition** · glare-hover · antigravity · logo-loop 🚫 · target-cursor · magic-rings · laser-flow · magnet-lines · ghost-cursor · gradual-blur · click-spark · magnet · strands · sticker-peel · **pixel-trail** · cubes · metallic-paint · **noise** · shape-blur · crosshair · **image-trail** · ribbons · splash-cursor · meta-balls · blob-cursor · star-border

### Components(42)
animated-list · scroll-stack · bubble-menu 🚫 · magic-bento 🚫 · circular-gallery · reflective-card · card-nav 🚫 · stack · fluid-glass · pill-nav 🚫 · tilted-card · **masonry**(/photos 索引布局参考)· glass-surface · dome-gallery · chroma-grid · folder · staggered-menu 🚫 · model-viewer · lanyard · profile-card · dock 🚫 · gooey-nav 🚫 · pixel-card · carousel 🚫 · spotlight-card · border-glow · flying-posters · card-swap · glass-icons · **decay-card**(名字就叫衰减——EXP-003 叙事近亲,读源码)· flowing-menu 🚫 · elastic-slider · counter · infinite-menu 🚫 · stepper

### Backgrounds(47)
ferrofluid · lightfall · liquid-ether · prism · dark-veil · light-pillar · silk · floating-lines · side-rays · light-rays · pixel-blast · color-bends · evil-eye · line-waves · **radar**(仪表感)· soft-aurora 🚫 · aurora 🚫 · plasma · plasma-wave · **particles** · gradient-blinds · **grainient**(grain 类,与 Paper Shaders 比选)· grid-scan · beams 🚫 · pixel-snow · lightning · prismatic-burst · **galaxy**(夜空,404/实验素材)· **dither** · **faulty-terminal**(故障终端——实验素材强候选)· ripple-grid · **dot-field** · dot-grid · threads · hyperspeed 🚫 · iridescence · waves · grid-distortion · ballpit · orb · **letter-glitch**(字符雨/故障墙)· grid-motion · shape-grid · liquid-chrome · balatro

---

## 3. Fancy Components(副源:玩具向物理/文字微交互)

- **地址:** fancycomponents.dev · **授权:** free & open source(MIT)
- **对本站:** 物理类交互的仪器库;文字类与 variable font 玩法是差异化货源

**Text(20):** Basic Number Ticker · **Breathing Text**(呼吸节律文字——EXP-001 breathing field 的天然配套)· Letter 3D Swap · Letter Swap · Random Letter Swap · **Scramble Hover** · **Scramble In** · Scroll and Swap · Text Along Path · Text Cursor Proximity · Text Highlighter · Text Rotate · Typewriter · Underline Animation · Underline to Background · Variable Font and Cursor · Variable Font Cursor Proximity · Variable Font Hover by Letter · Variable Font Hover by Random Letter · **Vertical Cut Reveal**

**Physics(3):** Cursor Attractor and Gravity · Elastic Line · **Gravity**(文字/元素受重力——实验素材)

**Image(2):** **Image Trail**(鼠标拖出照片轨迹,/photos 或独立 EXP)· Parallax Floating

**Filter(2):** Gooey SVG Filter · **Pixelate SVG Filter**(纯 SVG 像素化,零 canvas 成本)

**Block(10):** Circling Elements · CSS Box · Drag Elements · Float · Marquee Along SVG Path · Media Between Text · **Screensaver**(屏保式漂移——"夜里没人时实验室在干嘛"的叙事素材)· Simple Marquee 🚫 · Stacking Cards · Sticky Footer

**Background(2):** Animated Gradient SVG · Pixel Trail · **Carousel(1):** Box Carousel 🚫

---

## 4. Motion Primitives(副源:克制的基础动效)

- **地址:** motion-primitives.com(官网对爬虫 403,以下清单实抓自 GitHub `components/core`,5.7k stars,beta)· **授权:** MIT · motion/react + Tailwind
- **对本站:** 不抢戏的 chrome 层动效——正好归全站"微交互层"管;它是唯一主要服务房间 chrome 而非 /lab 的副源

**33 个 core 组件:** accordion · animated-background · animated-group · **animated-number / sliding-number**(仪表读数数字滚动——注意 §2 预算,演一次即停)· border-trail · carousel 🚫 · cursor · dialog · disclosure · dock 🚫 · glow-effect · **image-comparison**(/photos 修前修后对比,若做暗房工艺内容)· **in-view**(入场淡入的标准件)· infinite-slider 🚫 · magnetic · **morphing-dialog**(/photos 灯箱开合候选——缩略图形变为全屏,比生硬 modal 更"拿起底片")· morphing-popover · **progressive-blur**(照片边缘渐隐)· scroll-progress · spinning-text · spotlight · **text-effect**(入场文字的克制方案)· text-loop 🚫(循环)· text-morph · text-roll · **text-scramble**(解密美学同源,mono 读数可用)· text-shimmer / text-shimmer-wave · tilt · toolbar-dynamic · toolbar-expandable · **transition-panel**(面板切换,实验信息面板可用)

---

## 5. 21st.dev(搜索引擎,不是货架)

- **地址:** 21st.dev · 社区市场,"crafted components, not AI slop",分类覆盖 50+ 组件类型,支持 CLI/MCP 安装
- **用法:** 缺某个具体件时先来搜,**搜到的东西同样要过策展三问 + 配色收敛**;社区质量参差,默认只当灵感与实现参考,不直接进仓库

---

## 不列为源

- **Magic UI** — 与 Aceternity 高度重叠,且更偏 SaaS 营销页(决策记录在 DESIGN.md §10.2)

---

## 按用途反查(本站真实需求 → 去哪家找)

| 需求 | 首选 | 备选 |
|---|---|---|
| 解密/scramble 文字 | **已有 EncryptedText ✅** | MP text-scramble · RB scrambled-text · Fancy Scramble In |
| glitch / 故障美学(/lab) | RB letter-glitch · faulty-terminal · glitch-text | RB fuzzy-text |
| ASCII 渲染 | Aceternity ASCII Art 📌 | RB ascii-text |
| dither / halftone(暗房) | **Paper Shaders(免费,DESIGN §10.3)** | RB dither · Aceternity Dither Shader 💰 |
| grain 底噪 | **Paper Shaders Grain** | RB grainient / noise |
| 呼吸节律(EXP-001) | 自写参数驱动 Wavy | Fancy Breathing Text(文字配套) |
| 照片灯箱开合 | MP morphing-dialog | 自写 |
| 照片索引布局 | 自写 justified | RB masonry(参考实现) |
| 鼠标照片轨迹 | Fancy Image Trail | RB image-trail |
| 入场淡入/入视口 | MP in-view · text-effect | motion/react 手写 |
| 数字/时间读数动画 | MP sliding-number(演一次即停) | RB count-up |
| 像素化/降解(记忆失真类) | Fancy Pixelate SVG Filter(轻) | RB pixel-transition / decay-card 源码 · Pixelated Canvas 💰 |
