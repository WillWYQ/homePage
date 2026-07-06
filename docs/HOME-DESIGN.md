# / — 走廊 · 页面设计文稿

> willsleep.dev · 2026-07-05
> 隶属 [DESIGN.md](DESIGN.md) §3/§5 的首页,本文稿是它的完整规格。冲突时以本文稿为准。

---

## 1. 概念

走廊有两个身份,对应两种完全不同的访问场景:

1. **门厅(第一次进楼):** 从街上走进来,灯亮起来——Vortex 开场是入楼仪式,一晚只演一次。
2. **枢纽(之后的每一次路过):** 全站没有全局菜单,换房间都经走廊中转。此时走廊必须是**零成本通道**:无开场、无动画等待、导航即刻可点。

设计的全部难点就是让这两个身份互不打扰:**仪式感给第一次,效率给之后的每一次。** 走廊的"空"依然是设计的一部分——一屏放完,永不滚动。

## 2. 页面结构(单屏,h-dvh,无滚动)

```
┌─────────────────────────────────────────┐
│ 03:12 · you're in the right place        │ ← 仪表读数(左上角,mono,唯一一条)
│                                          │
│                                          │
│            The Sleep Lab                 │ ← h1,Lora,4xl/5xl(现状不动)
│          a space for dreaming            │ ← tagline,white/70(现状不动)
│                                          │
│   now · lab · notes · photos · about     │ ← 导航,mono,white/60
│                                          │
│                                          │
│  Looking for my engineering work? …      │ ← 页脚(全站统一,bottom center)
└─────────────────────────────────────────┘
          背景:WavyBackground(豁免的"走廊灯",§DESIGN 2 动效原则)
```

层次即优先级:标题是房子的名字,导航是五扇门,读数是墙上的钟。没有第四样东西。

## 3. 开场仪式(Vortex intro)

### 3.1 状态机

```
[mounted] ──不满足播放条件──────────────→ [gone](直接呈现走廊)
    │
    └─满足条件→ [playing] ─3.5s 或任意输入─→ [fading](0.7s 淡出)─→ [gone]
                                                    └─ 写入 sessionStorage
```

**播放条件(全部满足才播):**

| 条件 | 说明 |
|---|---|
| `sessionStorage['sl.intro.seen']` 不存在 | 一晚一次;从房间返回走廊永不重播 |
| 非 `prefers-reduced-motion` | 降级访客直接见走廊 |
| willsleep 构建 | "Living outside the bitmask" 是这栋楼的身份,yueqiao 占位站不播 |
| JS 已挂载 | 开场 overlay **只在客户端 mount 后渲染**,无 JS 访客直接看到走廊(SSR HTML 里没有 overlay) |

### 3.2 行为细节

- 时长与淡出沿用现有常量:`INTRO_DURATION_MS = 3500`、`INTRO_FADE_MS = 700`;解密文字 "Living outside the bitmask" 与 50ms/字符的节奏不变。
- 跳过事件沿用:`wheel / touchstart / pointerdown / keydown`。
- **跳过提示:** 播放 ~1.8s 后,overlay 底部淡入一行 mono 小字 `tap to enter ↵`(white/30)。第一次来的人不该猜"能不能跳"。
- 淡出后 Vortex 卸载(现状已做,canvas 停止耗电)。
- `sessionStorage` 写在开始淡出时(不是播完时),跳过也算看过。
- overlay `aria-hidden="true"`,不进无障碍树;焦点不被捕获,键盘用户第一下 Tab 落在导航第一项(那一下 keydown 同时触发跳过——行为自洽)。

## 4. 常态走廊(intro 之后 / 之外的一切)

### 4.1 标题区

现状文案与字号不动:`The Sleep Lab` / `a space for dreaming`(SITE_COPY 机制保留)。intro 淡出时走廊整体已在其下方,无需入场动画——**揭幕本身就是入场**。直接抵达(无 intro)时,标题区 200ms 淡入即可(微交互层预算)。

### 4.2 导航(五扇门)

- 内容:`now · lab · notes · photos · about`,mono,`text-sm`,间隔符 `·` 为 white/30。
- **颜色 white/60**(不是 40——交互文字要过对比度,white/40 只留给装饰性读数),hover/focus 变白,下划线 `underline-offset-4` 浮现,过渡 ≤200ms。
- `:focus-visible` 绿色描边(§DESIGN 10.5),`<nav aria-label="rooms">`,真实 `<a>` 链接。
- 触屏:每项 `py-3` 保证 ≥44px 点击区;五项单行在 320px 宽度下可容纳(mono text-sm 实测 ~270px),不换行。
- **不加房间描述、不加图标、不加编号。** 门牌只写名字。
- 房间未开放期间(分期上线),对应项**不渲染**——不是置灰(红线 3:没内容就不出现入口)。

### 4.3 仪表读数(左上角,唯一一条)

一行 mono,white/40,`text-xs`,由两段拼成,客户端 `useEffect` 后渲染(SSR 留空,避免水合不匹配):

**① 本地时间 + 分时段文案**(每分钟刷新):

| 访客本地时段 | 文案 |
|---|---|
| 22:00–02:00 | `the lights are on` |
| 02:00–05:00 | `you're in the right place` |
| 05:00–09:00 | `night shift ending` |
| 09:00–17:00 | `the lab sleeps during the day` |
| 17:00–22:00 | `warming up the instruments` |

呈现:`03:12 · you're in the right place`。文案属 chrome 字符串(`lib/i18n/strings.ts`,§DESIGN 7.4),canonical/en 同文,zh 版另译。

**② 最新记录**(可选段,构建期注入最新一条 note/REM/IR/roll 的编号与日期,客户端换算相对时间):

`· last entry: REM-007, two nights ago` —— 单位是 **nights**,不是 days(这栋楼按夜计时)。无内容时整段省略,读数只剩时间。

两段合计仍是一行;超长(窄屏)时第 ② 段隐藏(`hidden sm:inline`)。这行是"墙上的钟 + 门房的登记簿",不是 feed——**永不做成列表**。

### 4.4 页脚

全站统一页脚(§DESIGN 3):career 小字链接(带 UTM,仅 willsleep 构建)· RSS · 语言切换(P5 起)。bottom center,mono,white/40,间隔 `·`。现有 career 文案与链接不动(2026-07-02 已定稿)。

### 4.5 背景

- WavyBackground 是走廊的灯,持续运动的**唯一**全站豁免(§DESIGN 2),参数不动。
- 全站 grain 叠层(§DESIGN 10.3)在走廊同样存在,静态、≤5%。
- 除此之外走廊不再接受任何视觉组件——**落位表里走廊那行永远写"不再加任何东西"。**

## 5. 过场(corridor ↔ room)

- View Transitions(§DESIGN 10.4)做轻微交叉淡入,时长 ≤300ms,ease-out,无位移无缩放——开门,不是转场秀。
- 从房间回走廊:无 intro(sessionStorage 已置位)、无标题入场动画,交叉淡入结束即可点下一扇门。**回程成本 ≈ 一次点击 + 300ms。**
- 浏览器不支持 View Transitions 时自然回落为瞬时切换,不做 JS 模拟。

## 6. 双站与多语言

- **yueqiao 构建:** 保留现状占位(`Yueqiao Dev / Coming soon`)——无 intro、无导航、无读数、无 career 链接。门控沿用 `NEXT_PUBLIC_SITE_NAME`。
- **多语言(§DESIGN 7):** 标题、tagline、解密句在三版中**均不翻译**(它们是楼的名字和门口的铭牌,属于"仪器读数"级铁律);翻译的只有读数文案与页脚 UI 字符串。`/zh` `/en` 的走廊结构与 canonical 完全一致。

## 7. 实现与降级

| 场景 | 行为 |
|---|---|
| 无 JS | 无 overlay(§3.1),走廊完整可用:标题、导航、页脚都是静态 HTML;读数行整行不出现 |
| `prefers-reduced-motion` | 无 intro;Wavy 渲染静态first frame(canvas 画一帧后停);淡入全部取消 |
| 触屏 | 跳过事件含 touchstart;导航点击区 ≥44px |
| 窄屏(<640px) | 读数第②段隐藏;导航单行不换行;标题字号已有 md: 断点 |
| 标签页切后台 | Wavy 用 rAF 驱动,自然暂停;恢复时不追帧 |
| SEO | `/` 的 metadata 沿用 METADATA_MAP;h1 唯一;导航是可爬取的静态链接 |

组件结构建议:`app/page.tsx` 保持薄壳,拆 `components/corridor/`(`intro-overlay.tsx` / `corridor-nav.tsx` / `corridor-readout.tsx`),读数的构建期数据从 §DESIGN 4 内容库派生(`lib/content.ts` 暴露 `getLatestEntry()`)。

## 8. 验收清单

- [ ] 同一会话内:首次进 `/` 播 intro,跳过生效,`sl.intro.seen` 置位;从任意房间返回不重播
- [ ] 新会话(新标签页)重播——sessionStorage 语义验证
- [ ] reduced-motion / 无 JS / yueqiao 构建三种场景均无 intro,走廊直接可用
- [ ] 键盘:Tab 首落导航第一项,focus-visible 绿环,Enter 可进房间
- [ ] 读数:五个时段文案各自出现(改系统时钟验证);无内容构建时第②段消失;窄屏隐藏第②段
- [ ] 导航对比度 ≥4.5:1(white/60 on black),触屏点击区 ≥44px
- [ ] 未上线房间的门牌不渲染(而非置灰)
- [ ] View Transition 在支持/不支持的浏览器里各自正常
- [ ] Lighthouse:`/` 首屏无 CLS;intro 卸载后 canvas 无残留 rAF
