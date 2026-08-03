# /lab 框架 + EXP-001 breathing field — 设计文稿(Phase 2 垂直切片)

> 2026-08-02 · willsleep.dev (myHomePage)

## 0. 上位规格与定位

本期是 Phase 2 的**垂直切片**:把 /lab 框架立起来,并用 EXP-001 端到端验证它(顺带把音频引擎核心跑通)。

- 上位规格:[`docs/DESIGN.md` §5 /lab](../../DESIGN.md)(策展三问、索引/详情规格、注册表)、[`docs/SOUND-DESIGN.md`](../../SOUND-DESIGN.md)(声学三法则、引擎规格)。冲突时以上位规格为准。
- 本文稿只记录这一刀的**执行决策**与 **EXP-001 的仪器设计**,不复述已定案的上位约束。

**为什么是垂直切片:** 框架必须有一件真实验住在里面才算数(空 lab 即踩红线 3 的 coming-soon 占位);EXP-001 是首发三件里唯一发声的,能顺带把 AudioEngine 全链路验证。EXP-002 / 003 下一刀复用外壳,是快速跟进。

## 1. 切片范围

**做:**

- /lab 索引页 + `/lab/[slug]` 详情外壳(壳、注册表、HUD 徽标 + 四栏记录面板)
- `lib/audio.ts` 引擎**核心**(见 §4)
- EXP-001 breathing field 端到端(`components/experiments/`,方案 A)
- 索引页签名效果 Focus Cards
- reduced-motion 降级(静态帧 + 手动播放)
- `content/lab/001-breathing-field/index.md`(面板文字 + poster)

**不做(明确出局):**

- EXP-002 tonight's tides、EXP-003 dream decay —— 下一刀复用外壳
- noise-floor 混音台、room tone、sleep timer —— 候补实验,不进本期(因此 §4 的引擎不含这些)
- /notes、RSS、content 校验管线、`new:*` 脚手架 —— Phase 3

**完成标准:** EXP-001 在 `/lab/[slug]` 全屏运行、回答一个真问题、过策展三问;声音默认关、opt-in 后有 `sound: on` + `m`;reduced-motion 有静态帧 + 手动播放;双域名构建通过且 yueqiao 构建不出 /lab 入口。

## 2. EXP-001 breathing field — 仪器设计

**定位:** 受试者是凌晨两点躺着的人,眼睛多半闭着。这一页唯一的任务是**把访客的呼吸往入睡频率带,且在 TA 不再盯着看时仍然工作**。

**反默认(anti-default):** 模板呼吸 App 动画一个**放缩的圆**让你盯着看。对本站的受试者是错的:焦点物要求注意力,而注意力与入睡相反;一闭眼它就失效。SOUND-DESIGN 已给出判据——"闭上眼睛这件仪器仍然工作"。视觉必须达到同一条线。

**签名(这一页被记住的那一件事):** **整个波场的亮度即呼吸。** 没有焦点物。吸气 4s 波场变亮并升起,屏息 7s 悬停,呼气 8s 变暗并沉降——且**基线亮度随每个周期递减**,整件仪器沿会话缓慢熄向黑。闭眼也能透过眼睑感到明暗(光透眼睑是真实生理),而它终止的方向正是睡眠的方向:暗。

**一个审美风险及其理由:** "整屏亮度呼吸"做不好会读成"一块在调光的屏"。化解:波场有有机运动(振幅),亮度与清晰的相位读数、可选呼吸音绑在同一时钟上,读起来是一台在报相位节的仪器,不是氛围屏保。理由充分——研究问题就是"把呼吸降到入睡频率",所以仪器必须奖励闭眼使用、并以黑暗为终点;放缩圆两者都做不到。

**4-7-8 相位时钟(单一时钟,视觉与音频共用):**

| 相位 | 时长 | 波场 | 音频(开启时) |
|---|---|---|---|
| inhale | 4s | 亮度 + 振幅升起 | 滤波噪声渐强 |
| hold | 7s | 悬停(微幅 shimmer,不升) | 保持 |
| exhale | 8s | 亮度 + 振幅沉降,基线较上一周期更低 | 渐弱 |

**读数遵循仪表排版(DESIGN §2):** 相位读数是一行 mono `text-xs white/40`,不加字号/粗细强调——要突出的是它出现的位置,不是大小。**波场负责引导,文字只负责报数。**

```
┌────────────────────────────────────────────────┐
│ EXP-001 · breathing field   ▸ record           │  mono 徽标 → 四栏记录面板
│                                                │
│              ～  ～   ～   ～   ～                │  波场铺满视口
│              亮度 + 振幅随 4-7-8 呼吸             │  inhale 亮/升 · hold 悬停
│                                                │  exhale 暗/沉(基线递减)
│              inhale ···· 4                     │  单行 mono 相位读数
│                                                │
│ ◂ back          sound: off · m        Esc      │  控制行,mono
└────────────────────────────────────────────────┘
```

## 3. 实现路线 — 方案 A(自绘 canvas + 呼吸时钟)

一个 `<canvas>` 渲染深色波场,振幅/频率由 4-7-8 相位状态机驱动;同一时钟驱动可选呼吸音(走 §4 的引擎)。

- **取 A:** 策展三问第 2 问要求"拿走借来的组件还剩我的东西"——剩下的是 4-7-8 参数化、基线递减的熄向睡眠机制、闭眼亮度设计。这正是实验的实体。亮度呼吸 + 基线递减也无法挂在现成 WavyBackground 上。
- **否 B(复用/调制 WavyBackground):** 其内部不为精确节律驱动的振幅控制设计,能否被外部时钟干净调制存疑;拿掉组件后所剩无几,策展第 2 问不过;音频同步困难。
- **否 C(SVG/CSS 波):** 做不出连续有机的"场",也难读成"一台在测呼吸的仪器"。

WavyBackground 仅作**美学参照**,不作实现。

## 4. 音频引擎边界(lib/audio.ts)

**本期建"引擎核心 + EXP-001 呼吸音",不建 noise-floor 混音台。**

- **核心(按 SOUND-DESIGN §6):** 单例 AudioContext(首次 opt-in 手势时创建);master GainNode 封顶 0.25;一切参数变更走 `setTargetAtTime`/线性 ramp(≥20ms),直接 `gain.value=` 赋值视为 bug;离开实验页(路由切换)淡出 300ms 后 `suspend()`,`visibilitychange` 隐藏立即 suspend;真关用 suspend,不是 gain=0。
- **EXP-001 呼吸音:** 与波场同一 4-7-8 时钟驱动的滤波噪声起伏(吸气渐强、呼气渐弱)。默认关、opt-in 开;HUD 常驻 `sound: on`,`m` 即静;`<button aria-pressed>` 真按钮。
- **出局:** 三噪声(白/粉/棕)混音、60Hz HVAC 嗡鸣、sleep timer、localStorage 记忆——均属 noise-floor(候补),本期不建。

## 5. 框架(/lab 框架决策)

- **索引页:** 网格卡片。每卡 `EXP-001`(mono)+ 名称 + **一个问句** + 状态 `ongoing`。缩略用**静态 poster**(不做 live canvas 预览,首屏性能优先)。签名效果 = **Focus Cards**(hover 聚焦一张、其余暗化),配色收敛到白/灰 + 终端绿。
- **详情页外壳 `/lab/[slug]`:** 全屏交互画布;左上 mono 徽标 `EXP-001 · breathing field`,hover/点击展开四栏记录面板 `question / method / observation / instruments`;`Esc` 或 `◂` 返回。
- **注册表:** 元数据与面板文字在 `content/lab/<slug>/index.md`(poster 同文件夹);`generateStaticParams` 扫该目录;`lib/experiments.ts` 只做 slug → 组件映射;每个实验是 `'use client'` 组件,`next/dynamic` 按需加载。
- **poster:** EXP-001 用**波场的一个静态帧**(构建期/手工导出一张),不做 live 预览。

## 6. 无障碍与降级

- reduced-motion:canvas 降为静态帧 + 手动播放按钮(DESIGN §2)。
- 声音永不是唯一信息通道:相位既有波场亮度、又有一行读数;关声零信息损失。
- `:focus-visible` 绿色焦点环;发声开关 `aria-pressed`;HUD 快捷键行写 `m` 静音 / `Esc` 返回。
- 仪表读数一致性:本实验的读数与其它房间并排截图分不出出处(DESIGN §2)。

## 7. 验收清单(本切片)

- [ ] /lab 索引:Focus Cards 生效,卡片含问句 + 状态,poster 静态无 live canvas
- [ ] `/lab/[slug]`:全屏画布、HUD 徽标展开四栏面板、`Esc`/`◂` 返回
- [ ] EXP-001:4-7-8 相位正确(4/7/8s),波场亮度随相位呼吸、基线逐周期递减
- [ ] 声音默认关;opt-in 后 `sound: on` 常驻、`m` 与按钮即时静音;开关无爆音
- [ ] 路由离开 300ms 内无声、切后台立即静音
- [ ] reduced-motion:静态帧 + 手动播放可用
- [ ] 关声重玩,信息零损失
- [ ] 策展三问逐条过(问句/拿走组件剩什么/动=测量)
- [ ] 双域名构建通过;yueqiao 构建无 /lab 入口
