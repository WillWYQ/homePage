# /lab 框架 + EXP-001 breathing field — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 /lab 实验区立起来(索引页 + 全屏详情页 + 实验注册表 + 音频引擎核心),并用 EXP-001 breathing field 端到端验证——整片波场的亮度随 4-7-8 呼吸时钟起伏、基线逐周期递减、可选呼吸音。

**Architecture:** 静态导出(`output: 'export'`)。内容读 `content/lab/<slug>/index.md`(gray-matter)。索引页与详情页是 Server Component(详情页 `generateStaticParams` + `dynamicParams=false`);实验本体是 `'use client'` canvas 组件,经 `next/dynamic(ssr:false)` 在一个 client 壳里按需加载。音频是单例引擎(`lib/audio.ts`),只在 opt-in 手势后创建 AudioContext,一切增益变更走 ramp。

**Tech Stack:** Next.js 16(app router, static export, `trailingSlash: true`)、React 19、TypeScript strict、Tailwind CSS v4、`simplex-noise`(已安装)、Web Audio API、`next/font`(Geist Sans/Mono/Lora 已就位)。

## Global Constraints

- **这版 Next.js 与训练数据不同。** 写任何 Next 相关代码前,先读 `node_modules/next/dist/docs/` 对应文档。本计划已按此核对:`params` 是 **Promise** 必须 `await`;静态导出的动态路由**必须** `generateStaticParams` 且 `export const dynamicParams = false`;`next/dynamic` 的 `ssr: false` 只能出现在 **client 组件**里;浏览器 API 只在 `useEffect`/事件回调里碰。
- **包管理用 pnpm**(仓库有 `pnpm-lock.yaml` 与 `packageManager: pnpm@11`)。加依赖用 `pnpm add`,不要用 npm/yarn。不要动 `package-lock.json`。
- **单一强调色:** 终端绿 `#22c55e`(Tailwind `green-500`)。灰阶只用 `white / white/70 / white/40`(交互 mono 门牌级用 `white/60`)。不引入第二种彩色。
- **仪表读数规格(DESIGN §2):** 一切"报数"用 `font-mono text-xs text-white/40`,无字号/粗细阶。本计划的读数行全部照此。
- **声音三法则(SOUND-DESIGN):** chrome 静音;只有实验内部发声且是真实信号;永远 opt-in、默认关、`m` 静音、状态可见。音频参数变更一律 `setTargetAtTime`/ramp,**直接给 `gain.value` 赋非零值是 bug**。
- **编号永不复用;** 实验状态只有 `ongoing | archived`。
- **双站门控:** 每个新页面 `if (!isWillsleep) notFound()`。yueqiao 构建不得出现 /lab 内容或入口。
- **本仓库没有测试框架**(无 vitest/jest、无 test script)。本计划**不引入**测试框架;每个任务的验收 = `npx tsc --noEmit` + `pnpm build:willsleep`(关键任务再跑 `pnpm build:yueqiao`)+ 列出的手动检查。呼吸时钟、音频 ramp、content 读取都写成小的纯函数,日后可直接接测试。若你(执行者)被要求加测试,先与人确认,别擅自引入。
- **iCloud 构建隐患:** 若 build 卡在 0% CPU 不动,先怀疑 iCloud dataless 文件(见 memory `icloud-drive-build-hazard`),`rm -rf node_modules && pnpm install --frozen-lockfile` 再试,不要去"调试"挂死。
- **提交:** 每个任务收尾单独 commit,消息用仓库现有风格(`feat:` / `docs:` / `chore:`),结尾带 `Co-Authored-By: Claude <noreply@anthropic.com>`。

---

## 文件结构(本计划结束时)

**新建:**
- `lib/audio.ts` — 音频引擎单例(核心 + EXP-001 呼吸音)。
- `lib/experiments.ts` — `'use client'`,slug → 实验组件的 `next/dynamic` 映射。
- `app/lab/page.tsx` — 索引页(Server Component)。
- `app/lab/[slug]/page.tsx` — 详情页(Server Component,`generateStaticParams` + `dynamicParams=false`)。
- `components/lab/lab-grid.tsx` — 索引网格(Focus Cards,CSS 实现)。
- `components/lab/experiment-stage.tsx` — `'use client'` 全屏壳,按 slug 载入实验。
- `components/lab/experiment-hud.tsx` — `'use client'` 通用 chrome:EXP 徽标 → 四栏记录面板、`◂`/`Esc` 返回。
- `components/experiments/breathing-field.tsx` — EXP-001 canvas + 4-7-8 时钟 + 相位读数 + 可选呼吸音。
- `content/lab/001-breathing-field/index.md` — EXP-001 元数据与记录面板文字。
- `public/lab/001-breathing-field.svg` — EXP-001 静态海报。

**修改:**
- `lib/content.ts` — 新增 lab 读取器 + 填 `getRoomStatuses().lab`。
- `lib/i18n/strings.ts` — 新增 lab UI 字符串。
- `lib/rooms.ts` — `lab.open` 翻为 `true`(任务 6 才做)。
- `app/globals.css` — Focus Cards 的 hover 暗化规则。
- `app/sitemap.ts` — 收录 `/lab/[slug]/` 详情 URL(任务 6)。

**职责边界:** 读数据在 `lib/content.ts`;slug→组件在 `lib/experiments.ts`;路由壳在 `app/lab/`;可交互的在 `components/lab/` 与 `components/experiments/`。页面与组件不写死任何文案——面板文字全在 content。

---

## Task 1: 内容层 — lab 读取器 + EXP-001 内容 + i18n 字符串

**Files:**
- Modify: `lib/content.ts`(新增 lab 段;填 `getRoomStatuses().lab`)
- Modify: `lib/i18n/strings.ts`(新增 lab 键)
- Create: `content/lab/001-breathing-field/index.md`

**Interfaces:**
- Produces(供任务 4/5/6):
  - `export type LabStatus = "ongoing" | "archived";`
  - `export type LabExperiment = { slug: string; exp: string; title: string; question: string; status: LabStatus; method: string; observation: string; instruments: string[]; poster: string | null; };`
  - `export function getLabExperiments(): LabExperiment[]`
  - `export function getLabExperiment(slug: string): LabExperiment | null`
- Consumes: 现有 `readUnit(...segments)`、`toStringList(value)`(同在 `lib/content.ts`)。

- [ ] **Step 1: 写 `content/lab/001-breathing-field/index.md`**

```markdown
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

- [ ] **Step 2: 在 `lib/content.ts` 末尾新增 lab 读取器**

在 `getRoomStatuses()` **之前**插入这一整段(类型 + 两个函数)。注意复用文件里已有的 `readUnit` 与 `toStringList`:

```typescript
// ——————————————— /lab 实验区 ———————————————
// 元数据与记录面板文字全住 content/lab/<slug>/index.md(§DESIGN 5)。
// 读不到/字段缺 title 或 question 的单元直接忽略——宁缺毋滥(红线 3)。

export type LabStatus = "ongoing" | "archived";

export type LabExperiment = {
  slug: string;
  exp: string;
  title: string;
  question: string;
  status: LabStatus;
  method: string;
  observation: string;
  instruments: string[];
  poster: string | null;
};

function toLabExperiment(slug: string, data: Record<string, unknown>): LabExperiment | null {
  if (typeof data.title !== "string" || typeof data.question !== "string") return null;
  return {
    slug,
    exp: typeof data.exp === "string" ? data.exp : "",
    title: data.title,
    question: data.question,
    status: data.status === "archived" ? "archived" : "ongoing",
    method: typeof data.method === "string" ? data.method : "",
    observation: typeof data.observation === "string" ? data.observation : "",
    instruments: toStringList(data.instruments),
    poster: typeof data.poster === "string" ? data.poster : null,
  };
}

export function getLabExperiments(): LabExperiment[] {
  const dir = path.join(CONTENT_DIR, "lab");
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return [];
  }
  const list: LabExperiment[] = [];
  for (const name of entries.sort()) {
    const unit = readUnit("lab", name);
    if (!unit) continue;
    const exp = toLabExperiment(name, unit.data);
    if (exp) list.push(exp);
  }
  return list;
}

export function getLabExperiment(slug: string): LabExperiment | null {
  const unit = readUnit("lab", slug);
  if (!unit) return null;
  return toLabExperiment(slug, unit.data);
}
```

- [ ] **Step 3: 填 `getRoomStatuses().lab`(走廊门缝读数)**

把 `getRoomStatuses()` 里 `lab: null,` 一行替换为:

```typescript
    lab: (() => {
      const exps = getLabExperiments();
      return exps.length
        ? { experiments: exps.length, ongoing: exps.filter((e) => e.status === "ongoing").length }
        : null;
    })(),
```

- [ ] **Step 4: 在 `lib/i18n/strings.ts` 的 `STRINGS` 对象里新增 lab 键**

加在 `"about.annotation"` 之后、`"notFound.stamp"` 之前(保持分节顺序),作为新的一节:

```typescript
  // /lab 实验区(§DESIGN 5)。相位词 inhale/hold/exhale 是仪表读数,不进字典(§7.1)。
  "lab.back": { canonical: "lab", zh: "实验区", en: "lab" },
  "lab.record.question": { canonical: "question", zh: "问题", en: "question" },
  "lab.record.method": { canonical: "method", zh: "方法", en: "method" },
  "lab.record.observation": { canonical: "observation", zh: "观察", en: "observation" },
  "lab.record.instruments": { canonical: "instruments", zh: "器材", en: "instruments" },
  "lab.status.ongoing": { canonical: "ongoing", zh: "进行中", en: "ongoing" },
  "lab.status.archived": { canonical: "archived", zh: "已归档", en: "archived" },
```

- [ ] **Step 5: 类型检查 + 双站构建**

Run: `npx tsc --noEmit`
Expected: 无错误。
Run: `pnpm build:willsleep`
Expected: 构建成功(此时还没有 /lab 路由,只是确认读取器不破坏构建)。
Run: `pnpm build:yueqiao`
Expected: 构建成功。

- [ ] **Step 6: Commit**

```bash
git add lib/content.ts lib/i18n/strings.ts content/lab/001-breathing-field/index.md
git commit -m "feat(lab): content reader for experiments + EXP-001 metadata + i18n strings"
```

---

## Task 2: 音频引擎核心 — lib/audio.ts

**Files:**
- Create: `lib/audio.ts`

**Interfaces:**
- Produces(供任务 3):
  - `export type BreathVoice = { setLevel(v: number): void; stop(): void };`
  - `export const audio: AudioEngine`,其中 `AudioEngine` 有:
    - `enable(): Promise<void>`(首次 opt-in 手势时调用,幂等)
    - `setMuted(m: boolean): void`、`toggleMute(): void`
    - `readonly muted: boolean`、`get active(): boolean`
    - `suspend(): void`
    - `createBreathVoice(): BreathVoice`
- Consumes: 无(纯浏览器 Web Audio,只在 client 运行)。

**要点(SOUND-DESIGN §6,逐条落实):** 单例;首次 opt-in 手势才建 AudioContext;master gain 封顶 0.25;一切参数变更走 `setTargetAtTime`/ramp(绝不直接赋非零增益);真关 = `suspend()`,不是 `gain=0`(iOS);`visibilitychange` 隐藏即挂起。

- [ ] **Step 1: 写 `lib/audio.ts`**

```typescript
// 声学引擎(§SOUND-DESIGN 6)。单例;只在 /lab 实验内部、opt-in 手势后创建 AudioContext。
// 防爆音:一切参数变更走 ramp(setTargetAtTime),绝不直接给增益赋非零值。
// 本切片只含引擎核心 + EXP-001 呼吸音;noise-floor 混音台/sleep timer 属候补,不在本期。

const MASTER_MAX = 0.25; // §SOUND-DESIGN 3:master gain 上限
const VOICE_MAX = 0.5;   // 呼吸音峰值;× master 后 ≈ 0.125,不刺耳
const RAMP_FAST = 0.06;  // 开关/停起的时间常数,≥20ms 防爆音
const RAMP_ATTACK = 0.12; // 呼吸音起音时间常数,≥50ms(§SOUND-DESIGN 3)

export type BreathVoice = {
  /** v ∈ [0,1],跟随 4-7-8 包络;ramp 到 v * VOICE_MAX */
  setLevel(v: number): void;
  stop(): void;
};

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private visBound = false;
  muted = false;

  /** 已 opt-in 且未静音。 */
  get active(): boolean {
    return this.ctx !== null && !this.muted;
  }

  /** 首次 opt-in 手势调用:建 context + master(从 0 ramp 到 MASTER_MAX)。幂等。 */
  async enable(): Promise<void> {
    if (typeof window === "undefined") return;
    if (this.ctx) {
      if (this.ctx.state === "suspended") await this.ctx.resume();
      return;
    }
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);
    this.master.gain.setTargetAtTime(MASTER_MAX, this.ctx.currentTime, RAMP_FAST);
    this.bindVisibility();
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  /** 静音 = suspend(真关,iOS 不依赖静音拨片);取消静音 = resume。 */
  setMuted(m: boolean): void {
    this.muted = m;
    if (!this.ctx) return;
    if (m) {
      this.ctx.suspend();
    } else if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  toggleMute(): void {
    this.setMuted(!this.muted);
  }

  /** 路由离开实验页:挂起。 */
  suspend(): void {
    if (this.ctx && this.ctx.state === "running") this.ctx.suspend();
  }

  /** 切后台立即挂起;回前台且未静音则恢复(§SOUND-DESIGN 6)。 */
  private bindVisibility(): void {
    if (this.visBound || typeof document === "undefined") return;
    this.visBound = true;
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.suspend();
      } else if (!this.muted && this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    });
  }

  /** EXP-001 呼吸音:循环白噪声 → 低通(低频域"气息")→ 增益;未 enable 时返回空操作。 */
  createBreathVoice(): BreathVoice {
    if (!this.ctx || !this.master) {
      return { setLevel: () => {}, stop: () => {} };
    }
    const ctx = this.ctx;
    const seconds = 2;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420; // 夜里的声音是低的(§SOUND-DESIGN 3)
    filter.Q.value = 0.7;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start();

    return {
      setLevel(v: number) {
        const target = Math.max(0, Math.min(1, v)) * VOICE_MAX;
        gain.gain.setTargetAtTime(target, ctx.currentTime, RAMP_ATTACK);
      },
      stop() {
        gain.gain.setTargetAtTime(0, ctx.currentTime, RAMP_FAST);
        window.setTimeout(() => {
          try {
            src.stop();
          } catch {
            // 已停,忽略
          }
        }, 600);
      },
    };
  }
}

export const audio = new AudioEngine();
```

- [ ] **Step 2: 类型检查 + 构建**

Run: `npx tsc --noEmit`
Expected: 无错误。
Run: `pnpm build:willsleep`
Expected: 构建成功。该模块无顶层副作用(不在 import 时建 AudioContext),静态预渲染不会碰 `window`。

- [ ] **Step 3: Commit**

```bash
git add lib/audio.ts
git commit -m "feat(lab): audio engine core — singleton, ramped gains, breath voice"
```

---

## Task 3: EXP-001 仪器 — breathing-field.tsx

**Files:**
- Create: `components/experiments/breathing-field.tsx`

**Interfaces:**
- Consumes: `audio`(任务 2,`@/lib/audio`)、`createNoise3D`(simplex-noise,已安装)。
- Produces: `export default function BreathingField()`——无 props,自含全屏 canvas + 相位读数 + 声音开关。被任务 4 的 `lib/experiments.ts` 经 `next/dynamic(ssr:false)` 载入。

**设计(SPEC §2,务必照做):** 没有焦点物、没有放缩的圆。**整片波场的亮度与振幅随 4-7-8 时钟呼吸**;基线亮度每周期 `× 0.9`(下限 0.18),仪器沿会话熄向黑。相位词 inhale/hold/exhale 与 `sound: on/off` 是仪表读数,按 §7.1 硬编码英文,不进 i18n。reduced-motion 时不自动播,给一个 `▸ play` 手动播放按钮。

- [ ] **Step 1: 写 `components/experiments/breathing-field.tsx`**

```tsx
"use client";

// EXP-001 breathing field(§DESIGN 5 /lab,SPEC §2)。
// 一块屏幕把呼吸往入睡频率带:整片波场的亮度 + 振幅挂在 4-7-8 时钟上,
// 基线逐周期递减、熄向黑。闭眼也能跟(亮度透眼睑,声音可关)。
// 相位词与 sound 读数是仪表读数,按 §7.1 硬编码英文,不进 i18n。

import { useEffect, useRef, useState } from "react";
import { createNoise3D } from "simplex-noise";
import { audio } from "@/lib/audio";

const INHALE = 4;
const HOLD = 7;
const EXHALE = 8;
const CYCLE = INHALE + HOLD + EXHALE; // 19s

// 基线亮度:每完成一个周期 × DECAY,下限 FLOOR——仪器沿会话熄向黑(SPEC §2)。
const BASELINE_START = 1;
const BASELINE_DECAY = 0.9;
const BASELINE_FLOOR = 0.18;
// 包络下限:不到全黑,暗由基线负责。
const ENV_MIN = 0.25;

const WAVE_COLORS = ["#22c55e", "#4ade80", "#16a34a", "#86efac", "#15803d"];

type PhaseId = "inhale" | "hold" | "exhale";

const easeInOut = (x: number) => x * x * (3 - 2 * x); // smoothstep

function phaseAt(tInCycle: number): { id: PhaseId; remain: number } {
  if (tInCycle < INHALE) return { id: "inhale", remain: INHALE - tInCycle };
  if (tInCycle < INHALE + HOLD) return { id: "hold", remain: INHALE + HOLD - tInCycle };
  return { id: "exhale", remain: CYCLE - tInCycle };
}

/** 相位包络 0..1:吸气升、屏息满、呼气落。 */
function envelopeAt(tInCycle: number): number {
  if (tInCycle < INHALE) return easeInOut(tInCycle / INHALE);
  if (tInCycle < INHALE + HOLD) return 1;
  return 1 - easeInOut((tInCycle - INHALE - HOLD) / EXHALE);
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function BreathingField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef<HTMLSpanElement>(null);
  // ssr:false,挂载即在 client,useState 初始化里读 matchMedia 安全。
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [soundOn, setSoundOn] = useState(false);

  const soundOnRef = useRef(false);
  const voiceRef = useRef<ReturnType<typeof audio.createBreathVoice> | null>(null);

  // 声音开关(按钮与 m 共用):开 = enable + 建呼吸音;关 = 静音(suspend,真关)。
  const toggleSound = async () => {
    if (!soundOnRef.current) {
      await audio.enable();
      audio.setMuted(false);
      if (!voiceRef.current) voiceRef.current = audio.createBreathVoice();
      soundOnRef.current = true;
      setSoundOn(true);
    } else {
      audio.setMuted(true);
      soundOnRef.current = false;
      setSoundOn(false);
    }
  };

  // m = 实验内静音快捷键(SOUND-DESIGN §7)。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "m" || e.key === "M") void toggleSound();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 离场:停呼吸音 + 挂起(SOUND-DESIGN §6)。
  useEffect(
    () => () => {
      voiceRef.current?.stop();
      audio.suspend();
    },
    [],
  );

  // 渲染循环:playing=true 跑 rAF;否则画一帧静止(reduced-motion 降级)。
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const noise = createNoise3D();

    let w = 0;
    let h = 0;
    let raf = 0;
    let start: number | null = null;
    let lastLabel = "";

    const drawWaves = (nt: number, amp: number) => {
      ctx.lineWidth = 40;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.strokeStyle = WAVE_COLORS[i % WAVE_COLORS.length];
        for (let x = 0; x <= w; x += 5) {
          const y = noise(x / 800, 0.3 * i, nt + i * 0.7) * amp;
          ctx.lineTo(x, y + h * 0.5);
        }
        ctx.stroke();
      }
    };

    const drawStatic = () => {
      ctx.filter = "blur(8px)";
      ctx.fillStyle = "#000";
      ctx.globalAlpha = 1;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 0.35;
      drawWaves(2.5, 70);
    };

    const frame = (now: number) => {
      if (start === null) start = now;
      const elapsed = (now - start) / 1000;
      const cycle = Math.floor(elapsed / CYCLE);
      const tIn = elapsed % CYCLE;
      const baseline = Math.max(BASELINE_FLOOR, BASELINE_START * BASELINE_DECAY ** cycle);
      const env = envelopeAt(tIn);
      const lum = baseline * (ENV_MIN + (1 - ENV_MIN) * env);
      const amp = 30 + 90 * env;
      const nt = elapsed * 0.15;

      // 残影衰减(铺底黑)与亮度(描边 alpha)是两件事,分两个 alpha(手法同 wavy-background)。
      ctx.filter = "blur(8px)";
      ctx.fillStyle = "#000";
      ctx.globalAlpha = 0.5;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = lum * 0.5;
      drawWaves(nt, amp);

      // 相位读数:直写 DOM,不进 React 渲染循环。
      const { id, remain } = phaseAt(tIn);
      const label = `${id} · ${Math.max(1, Math.ceil(remain))}`;
      if (label !== lastLabel && phaseRef.current) {
        phaseRef.current.textContent = label;
        lastLabel = label;
      }

      // 可选呼吸音:与波场同一时钟(SPEC §2)。
      if (soundOnRef.current && voiceRef.current) {
        voiceRef.current.setLevel(env * baseline);
      }

      raf = requestAnimationFrame(frame);
    };

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      if (!playing) drawStatic();
    };
    resize();
    window.addEventListener("resize", resize);

    if (playing) {
      raf = requestAnimationFrame(frame);
    } else {
      drawStatic();
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [playing]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* 底部仪表面板:左相位读数,右播放/声音控件。mono text-xs white/40。 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-between p-6 font-mono text-xs">
        <span ref={phaseRef} className="text-white/40">
          inhale · {INHALE}
        </span>
        <div className="pointer-events-auto flex items-center gap-4">
          {!playing && (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="text-white/60 underline-offset-4 transition-colors duration-200 hover:text-white focus-visible:text-white"
            >
              ▸ play
            </button>
          )}
          <button
            type="button"
            aria-pressed={soundOn}
            onClick={() => void toggleSound()}
            className="text-white/60 underline-offset-4 transition-colors duration-200 hover:text-white focus-visible:text-white"
          >
            {soundOn ? "sound: on" : "sound: off"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 类型检查 + 构建**

Run: `npx tsc --noEmit`
Expected: 无错误。
Run: `pnpm build:willsleep`
Expected: 构建成功。该组件尚未被任何路由引用(任务 4 才接上),但应能独立编译。

- [ ] **Step 3: Commit**

```bash
git add components/experiments/breathing-field.tsx
git commit -m "feat(lab): EXP-001 breathing field — 4-7-8 luminance breath, decaying baseline"
```

---

## Task 4: 详情路由 — 注册表 + 全屏壳 + HUD + [slug] 页

**Files:**
- Create: `lib/experiments.ts`
- Create: `components/lab/experiment-stage.tsx`
- Create: `components/lab/experiment-hud.tsx`
- Create: `app/lab/[slug]/page.tsx`(目录名字面是 `[slug]`,带方括号)

**Interfaces:**
- `lib/experiments.ts` produces: `export function experimentComponent(slug: string): ComponentType | null`
- `experiment-stage.tsx` produces: `export function ExperimentStage({ slug }: { slug: string })`
- `experiment-hud.tsx` produces: `export function ExperimentHUD({ experiment, locale }: { experiment: LabExperiment; locale: Locale })`
- Consumes: `getLabExperiment` / `getLabExperiments`(任务 1)、`BreathingField`(任务 3)、`LabExperiment` 类型、`t` / `Locale`(i18n)。

**Next 16 要点:** `params` 是 Promise,必须 `await`;`generateStaticParams` + `export const dynamicParams = false`;`next/dynamic(ssr:false)` 只能在 client 模块里(所以放在 `lib/experiments.ts`,该文件 `'use client'`)。

- [ ] **Step 1: 写 `lib/experiments.ts`(slug → 组件映射)**

```typescript
"use client";

// slug → 实验组件映射(§DESIGN 5):每个实验是 'use client' 组件,
// next/dynamic 按需加载。ssr:false 只能出现在 client 模块里,故本文件 'use client'。

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

const BreathingField = dynamic(() => import("@/components/experiments/breathing-field"), {
  ssr: false,
});

const REGISTRY: Record<string, ComponentType> = {
  "001-breathing-field": BreathingField,
};

export function experimentComponent(slug: string): ComponentType | null {
  return REGISTRY[slug] ?? null;
}
```

- [ ] **Step 2: 写 `components/lab/experiment-stage.tsx`(全屏壳)**

```tsx
"use client";

// /lab/[slug] 的全屏壳:按 slug 从注册表取实验组件渲染。
// 持续运动的 canvas 只许存在于 /lab/[slug] 全屏页内(§DESIGN 2 动效预算)——就是这里。

import { experimentComponent } from "@/lib/experiments";

export function ExperimentStage({ slug }: { slug: string }) {
  const Experiment = experimentComponent(slug);
  if (!Experiment) return null;
  return (
    <div className="absolute inset-0">
      <Experiment />
    </div>
  );
}
```

- [ ] **Step 3: 写 `components/lab/experiment-hud.tsx`(通用 chrome)**

```tsx
"use client";

// 全屏实验的通用 chrome:左上 EXP 徽标 → 展开四栏记录面板(question/method/observation/instruments);
// 右上 ◂ 与 Esc 返回 /lab。声音控件住在实验本体里(谁的仪器谁出声),这里保持安静(chrome 静音)。

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { LabExperiment } from "@/lib/content";
import { t, type Locale } from "@/lib/i18n/strings";

export function ExperimentHUD({
  experiment,
  locale,
}: {
  experiment: LabExperiment;
  locale: Locale;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push("/lab");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col p-6 font-mono text-xs">
      {/* 顶行:徽标(可点,展开记录面板) + 返回 */}
      <div className="flex items-start justify-between">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="pointer-events-auto text-left text-white/70 underline-offset-4 transition-colors duration-200 hover:text-white focus-visible:text-white"
        >
          EXP-{experiment.exp} · {experiment.title}
        </button>
        <Link
          href="/lab"
          className="pointer-events-auto text-white/60 underline-offset-4 transition-colors duration-200 hover:text-white hover:underline focus-visible:text-white"
        >
          ◂ {t("lab.back", locale)}
        </Link>
      </div>

      {/* 四栏记录面板(§DESIGN 5):方法与器材必须可复查——不许假。 */}
      {open && (
        <div className="pointer-events-auto mt-4 max-w-xl border border-white/10 bg-black/70 p-4 backdrop-blur-sm">
          <dl className="space-y-3">
            <div>
              <dt className="text-white/40">{t("lab.record.question", locale)}</dt>
              <dd className="mt-1 font-sans text-white/70">{experiment.question}</dd>
            </div>
            <div>
              <dt className="text-white/40">{t("lab.record.method", locale)}</dt>
              <dd className="mt-1 font-sans text-white/70">{experiment.method}</dd>
            </div>
            <div>
              <dt className="text-white/40">{t("lab.record.observation", locale)}</dt>
              <dd className="mt-1 font-sans text-white/70">{experiment.observation}</dd>
            </div>
            <div>
              <dt className="text-white/40">{t("lab.record.instruments", locale)}</dt>
              <dd className="mt-1 text-white/70">{experiment.instruments.join(" · ")}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* 底部快捷键提示(Esc 返回);m 静音提示由实验本体负责。 */}
      <div className="mt-auto self-end text-white/40">Esc</div>
    </div>
  );
}
```

- [ ] **Step 4: 写 `app/lab/[slug]/page.tsx`**

目录是字面 `[slug]`。文件内容:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExperimentHUD } from "@/components/lab/experiment-hud";
import { ExperimentStage } from "@/components/lab/experiment-stage";
import { getLabExperiment, getLabExperiments } from "@/lib/content";
import { isWillsleep } from "@/lib/site";
import type { Locale } from "@/lib/i18n/strings";

// /lab/[slug] — 单个实验,全屏交互(§DESIGN 5)。
// 静态导出:动态路由必须 generateStaticParams + dynamicParams=false。

export const dynamicParams = false;

export function generateStaticParams() {
  return getLabExperiments().map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  if (!isWillsleep) return { title: "Not found · Yueqiao Dev" };
  const { slug } = await params;
  const e = getLabExperiment(slug);
  if (!e) return { title: "Not found · The Sleep Lab" };
  return { title: `EXP-${e.exp} · ${e.title} · The Sleep Lab`, description: e.question };
}

export default async function LabExperimentPage({
  params,
  locale = "canonical",
}: {
  params: Promise<{ slug: string }>;
  locale?: Locale;
}) {
  // 双站门控:yueqiao 构建这条路由只是 404(红线 2 身份切分)。
  if (!isWillsleep) notFound();
  const { slug } = await params;
  const experiment = getLabExperiment(slug);
  if (!experiment) notFound();

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <ExperimentStage slug={experiment.slug} />
      <ExperimentHUD experiment={experiment} locale={locale} />
    </div>
  );
}
```

- [ ] **Step 5: 类型检查 + 构建 + 手动验证**

Run: `npx tsc --noEmit`
Expected: 无错误。
Run: `pnpm build:willsleep`
Expected: 构建成功;`out/lab/001-breathing-field/index.html` 存在(generateStaticParams 已生成)。
Run: `pnpm build:yueqiao`
Expected: 构建成功;`out/lab/` 下不应出现可访问的实验页(该路由 notFound)。
Run: `pnpm dev`(然后浏览器打开 `http://localhost:3000/lab/001-breathing-field/`)
Expected: 全屏绿色波场随 4-7-8 呼吸(吸气变亮升起 / 屏息悬停 / 呼气变暗沉降),几十秒后整体变暗(基线递减);左下相位读数在 `inhale / hold / exhale` 间切换;左上徽标点击展开四栏面板;`Esc` 或右上 `◂ lab` 返回 `/lab`(此时 /lab 尚未建,会 404——任务 5 修);点 `sound: off` 变 `sound: on` 能听到柔和呼吸音、`m` 可静音;开系统"减弱动态效果"后进入为静止帧并出现 `▸ play`。

- [ ] **Step 6: Commit**

```bash
git add lib/experiments.ts components/lab/experiment-stage.tsx components/lab/experiment-hud.tsx "app/lab/[slug]/page.tsx"
git commit -m "feat(lab): experiment detail route — registry, fullscreen stage, HUD, [slug] page"
```

---

## Task 5: 索引路由 — Focus Cards 网格 + 海报 + 全局 CSS

**Files:**
- Create: `components/lab/lab-grid.tsx`
- Create: `public/lab/001-breathing-field.svg`
- Create: `app/lab/page.tsx`
- Modify: `app/globals.css`(追加 Focus Cards 规则)

**Interfaces:**
- `lab-grid.tsx` produces: `export function LabGrid({ experiments, locale }: { experiments: LabExperiment[]; locale: Locale })`
- Consumes: `getLabExperiments`(任务 1)、`t` / `Locale`、`LabExperiment` 类型。

**签名(§DESIGN 10.1):** /lab 索引 = Focus Cards——hover 聚焦一张、其余暗化。**用纯 CSS `group` 规则实现**(微交互层 ≤200ms),不引入 JS、不做 live canvas;缩略图用静态海报 SVG。海报是"波场的一个静态帧",用 SVG 画几笔绿色模糊波形即可(零新增依赖、静态、非 live)。

- [ ] **Step 1: 写 `public/lab/001-breathing-field.svg`(静态海报)**

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450" role="img" aria-label="breathing field">
  <rect width="800" height="450" fill="#000"/>
  <defs>
    <filter id="b" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8"/>
    </filter>
  </defs>
  <g filter="url(#b)" fill="none" stroke-linecap="round">
    <path d="M0 225 C 100 180, 200 270, 300 225 S 500 180, 600 225 S 760 270, 800 225" stroke="#22c55e" stroke-width="30" opacity="0.5"/>
    <path d="M0 235 C 120 300, 240 170, 360 235 S 600 300, 800 235" stroke="#4ade80" stroke-width="24" opacity="0.35"/>
    <path d="M0 215 C 140 160, 280 280, 420 215 S 680 160, 800 215" stroke="#16a34a" stroke-width="26" opacity="0.3"/>
  </g>
</svg>
```

- [ ] **Step 2: 在 `app/globals.css` 末尾追加 Focus Cards 规则**

追加到文件最后(在 reduced-motion 媒体块之外):

```css
/* /lab 索引签名:Focus Cards——hover 聚焦一张、其余暗化(§DESIGN 10.1)。
   两条规则同权重,后者覆盖前者:被悬停/聚焦的卡恢复全亮。微交互层 ≤200ms。 */
.focus-cards:hover .focus-card,
.focus-cards:focus-within .focus-card {
  opacity: 0.35;
}
.focus-cards .focus-card:hover,
.focus-cards .focus-card:focus-within {
  opacity: 1;
}
.focus-card {
  transition: opacity 200ms ease-out;
}
@media (prefers-reduced-motion: reduce) {
  .focus-card {
    transition: none;
  }
}
```

- [ ] **Step 3: 写 `components/lab/lab-grid.tsx`**

```tsx
import Link from "next/link";
import type { LabExperiment } from "@/lib/content";
import { t, type Locale } from "@/lib/i18n/strings";

// /lab 索引网格(§DESIGN 5)。签名 = Focus Cards:hover 聚焦一张、其余暗化,
// 纯 CSS(globals.css 的 .focus-cards / .focus-card),无 JS、无 live canvas。
// 卡片:EXP 编号(mono 读数)+ 名称 + 一个问句 + 状态。空旷合法(红线 3)。

export function LabGrid({
  experiments,
  locale,
}: {
  experiments: LabExperiment[];
  locale: Locale;
}) {
  return (
    <ul className="focus-cards grid gap-6 sm:grid-cols-2">
      {experiments.map((e) => (
        <li key={e.slug} className="focus-card">
          <Link
            href={`/lab/${e.slug}/`}
            className="block border border-white/10 bg-white/[0.02] p-6 transition-colors duration-200 hover:border-green-500/40 focus-visible:border-green-500/40"
          >
            {e.poster && (
              // 静态海报(非 live canvas)。public/ 下,裸 <img> 即可(§DESIGN 5/photos)。
              // eslint-disable-next-line @next/next/no-img-element
              <img src={e.poster} alt="" className="mb-4 w-full opacity-80" />
            )}
            <p className="font-mono text-xs text-white/40">EXP-{e.exp}</p>
            <h2 className="mt-1 font-sans text-lg text-white">{e.title}</h2>
            <p className="mt-2 font-sans text-white/70">{e.question}</p>
            <p className="mt-4 font-mono text-xs text-white/40">
              {t(`lab.status.${e.status}`, locale)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
```

> 注:`t(\`lab.status.${e.status}\`)` 里 `e.status` 是 `"ongoing" | "archived"`,模板得到的 `"lab.status.ongoing" | "lab.status.archived"` 都在 `StringKey` 联合里,类型可过。若 TS 因模板字面量不收窄而报错,把这两行改为 `e.status === "archived" ? t("lab.status.archived", locale) : t("lab.status.ongoing", locale)`。

- [ ] **Step 4: 写 `app/lab/page.tsx`**

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LabGrid } from "@/components/lab/lab-grid";
import { RoomShell } from "@/components/room-shell";
import { getLabExperiments } from "@/lib/content";
import { isWillsleep } from "@/lib/site";
import type { Locale } from "@/lib/i18n/strings";

// /lab — 实验区索引(§DESIGN 5)。签名 = Focus Cards(见 lab-grid)。
// 红线 3:没有实验就 404,不放占位。

export const metadata: Metadata = isWillsleep
  ? { title: "lab · The Sleep Lab", description: "编号实验:用仪器研究睡眠、夜与记忆" }
  : { title: "Not found · Yueqiao Dev" };

export default function LabPage({ locale = "canonical" }: { locale?: Locale }) {
  if (!isWillsleep) notFound();
  const experiments = getLabExperiments();
  if (experiments.length === 0) notFound();

  return (
    // className 覆盖 RoomShell 默认的 max-w-2xl,给网格更宽的版面(twMerge 收敛)。
    <RoomShell room="lab" locale={locale} className="max-w-4xl">
      <LabGrid experiments={experiments} locale={locale} />
    </RoomShell>
  );
}
```

- [ ] **Step 5: 类型检查 + 构建 + 手动验证**

Run: `npx tsc --noEmit`
Expected: 无错误。
Run: `pnpm build:willsleep`
Expected: 构建成功;`out/lab/index.html` 存在。
Run: `pnpm dev` → 打开 `http://localhost:3000/lab/`
Expected: 顶栏 `◂ the sleep lab` / `lab`(RoomHeader);一张卡片,含海报、`EXP-001`、`breathing field`、问句、`ongoing`;hover 卡片时它保持全亮(若日后有多张,其余暗化);点卡片进 `/lab/001-breathing-field/`(任务 4 的详情页)正常。

- [ ] **Step 6: Commit**

```bash
git add components/lab/lab-grid.tsx public/lab/001-breathing-field.svg app/lab/page.tsx app/globals.css
git commit -m "feat(lab): index route — Focus Cards grid, static poster, focus-dim css"
```

---

## Task 6: 上线 — 翻开 lab 门牌 + sitemap 详情 + 红线自查

**Files:**
- Modify: `lib/rooms.ts`(`lab.open` → `true`)
- Modify: `app/sitemap.ts`(收录 `/lab/[slug]/` 详情 URL)

**Interfaces:**
- Consumes: `getLabExperiments`(任务 1)、`isWillsleep` / `SITE_URL`(`@/lib/site`)。

**说明:** 前面各任务里页面已存在但走廊不渲染 lab 门牌(`open:false`),也没进 sitemap——这正是红线 3 的"未上线不上入口"。本任务正式通电上线。

- [ ] **Step 1: `lib/rooms.ts` 把 lab 翻为 open**

把这一行:
```typescript
  { id: "lab", href: "/lab", open: false }, // 第 2 期
```
改为:
```typescript
  { id: "lab", href: "/lab", open: true }, // 第 2 期
```

- [ ] **Step 2: `app/sitemap.ts` 收录 lab 详情 URL**

在文件顶部加 import,并在 `return [...]` 里追加详情 URL。改后全文:

```typescript
import type { MetadataRoute } from "next";
import { getLabExperiments } from "@/lib/content";
import { openRooms } from "@/lib/rooms";
import { isWillsleep, SITE_URL } from "@/lib/site";

// 构建期静态产出(§DESIGN 8)。只收录**已上线**的房间——
// 红线 3 在 sitemap 上的形态:没上线的房间不该被爬虫发现。
// yueqiao 构建只收首页(不出新板块)。

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const home = { url: `${SITE_URL}/`, lastModified: new Date() };
  if (!isWillsleep) return [home];

  return [
    home,
    ...openRooms().map((room) => ({
      url: `${SITE_URL}${room.href}/`,
      lastModified: new Date(),
    })),
    // /lab 详情:逐实验收录(§DESIGN 7.5——真实存在的路由才进 sitemap)。
    ...getLabExperiments().map((e) => ({
      url: `${SITE_URL}/lab/${e.slug}/`,
      lastModified: new Date(),
    })),
  ];
}
```

- [ ] **Step 3: 双站构建 + 红线自查**

Run: `npx tsc --noEmit`
Expected: 无错误。
Run: `pnpm build:willsleep`
Expected: 成功;`out/sitemap.xml` 含 `/lab/` 与 `/lab/001-breathing-field/`。
Run: `pnpm build:yueqiao`
Expected: 成功;`out/sitemap.xml` **只有首页**;`out/` 里 lab 相关页不可达(notFound);走廊不渲染(本就返回占位页)。

**红线自查(逐条过,写进 commit 前的自检):**
- 红线 1(无简历内容):本任务没引入任何简历式内容。✅
- 红线 2(career 入口只有页脚小字):未新增 career 入口。✅
- 红线 3(宁缺毋滥):lab 有真实验才翻开;无 "coming soon" 占位。✅
- 声音三法则:chrome 静音(HUD 无声);EXP-001 声音 opt-in、默认关、`m` 可静;参数全走 ramp。✅
- 策展三问(EXP-001):① 它研究"屏幕能否把呼吸降到入睡频率"——是问句;② 拿走 simplex-noise/Web Audio,剩下 4-7-8 参数化、基线递减、闭眼亮度设计;③ 动 = 仪器在测相位,非装饰。✅

- [ ] **Step 4: Commit**

```bash
git add lib/rooms.ts app/sitemap.ts
git commit -m "feat(lab): launch lab room — open corridor door, index detail routes in sitemap"
```

---

## 收尾(全部任务完成后)

- 跑一遍完整手动走查(见下),确认 SPEC §7 验收清单逐条成立。
- SPEC §7 验收清单对照:索引 Focus Cards / 详情全屏 + 四栏面板 / 4-7-8 相位与基线递减 / 声音默认关 + opt-in + m + 无爆音 / 离场与切后台静音 / reduced-motion 静态帧 + 手动播放 / 关声重玩零信息损失 / 策展三问 / 双站构建且 yueqiao 无 lab。

**人工走查清单(`pnpm dev`,浏览器):**
1. `/` → 走廊出现 `lab` 门牌;hover 门牌,读数行显示 `lab: 1 experiment · 1 ongoing`。
2. 进 `/lab/` → 一张卡片;hover 全亮;点入详情。
3. `/lab/001-breathing-field/` → 波场呼吸、约 19s 一周期、逐周期变暗;相位读数切换;徽标展开四栏;`Esc`/`◂ lab` 返回。
4. 点 `sound: off` → 有柔和呼吸音随波场起伏、HUD/按钮显示 `sound: on`;`m` 静音;切到别的标签页再回来,声音行为正常;离开页面声音停。
5. 系统开"减弱动态效果"→ 详情页为静止帧 + `▸ play`;点击才开始动。
6. `NEXT_PUBLIC_SITE_NAME=yueqiao pnpm build`(即 `pnpm build:yueqiao`)→ 无 lab 入口、无 lab 内容、sitemap 只有首页。
