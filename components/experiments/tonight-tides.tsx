"use client";

// EXP-002 tonight's tides(§DESIGN 5 /lab,2026-08-21 spec §2)。
// 查询性仪器,不是过程性仪器(与 EXP-001 的区别见 spec):访客带着一个具体
// 问题来,读几个数字就走。复用 EXP-001 验证过的 simplex-noise 场绘制手法,
// 参数化方式完全不同——振幅按睡眠周期深浅曲线走,不是呼吸包络。
//
// 关键简化:canvas 的 x 轴是"就寝后经过的分钟数",与 bedtime 实际取值无关;
// 只有醒来时间标签(真实 DOM 文本)把分钟偏移换算成钟表时间。这意味着
// bedtime 变化时画布不必重绘,reduced-motion 降级不需要特殊的"重绘一帧"
// 逻辑——它本来就是一帧静态形状,只在窗口尺寸变化时重画。

import { useEffect, useRef, useState } from "react";
import { createNoise3D } from "simplex-noise";

const ONSET_BUFFER_MIN = 14; // 入睡缓冲(SPEC §2,常见简化模型)
const CYCLE_MIN = 90;
const WINDOW_HALF_MIN = 10; // 浅睡窗口是区间,±10min,不是精确单点(SPEC §2)
const SPAN_MIN = 9 * 60; // 铺开范围:bedtime 起 +9h

const WAVE_COLORS = ["#22c55e", "#4ade80", "#16a34a", "#86efac", "#15803d"];
const HIGHLIGHT = "#22c55e"; // 全站唯一强调色(§DESIGN 2)

type SleepWindow = {
  cycle: number;
  centerMin: number;
  startMin: number;
  endMin: number;
  /** 1 = 最深(第 1 周期),每周期 -0.15,下限 0.3——启发式简化,不是医学模型(诚实条款见 content)。 */
  depth: number;
};

/** 纯函数:bedtime 起 spanMin 分钟内的浅睡窗口。可脱离组件单独测试。 */
function computeWindows(spanMin: number = SPAN_MIN): SleepWindow[] {
  const windows: SleepWindow[] = [];
  for (let cycle = 1; ; cycle++) {
    const centerMin = ONSET_BUFFER_MIN + cycle * CYCLE_MIN;
    if (centerMin - WINDOW_HALF_MIN > spanMin) break;
    windows.push({
      cycle,
      centerMin,
      startMin: Math.max(0, centerMin - WINDOW_HALF_MIN),
      endMin: Math.min(spanMin, centerMin + WINDOW_HALF_MIN),
      depth: Math.max(0.3, 1 - (cycle - 1) * 0.15),
    });
  }
  return windows;
}

// 模块级常量,输入恒定,算一次够用——组件里直接引用,不进任何 effect 依赖数组。
const WINDOWS = computeWindows();

/** 深浅曲线在任意分钟点的插值(用于 amplitude),窗口之间线性过渡,不跳变。 */
function depthAt(min: number): number {
  let prev = { centerMin: 0, depth: 1 };
  for (const win of WINDOWS) {
    if (min <= win.centerMin) {
      const span = win.centerMin - prev.centerMin || 1;
      const t = (min - prev.centerMin) / span;
      return prev.depth + (win.depth - prev.depth) * t;
    }
    prev = { centerMin: win.centerMin, depth: win.depth };
  }
  return prev.depth;
}

const nowMinutes = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

const formatHM = (totalMin: number) => {
  const m = ((Math.round(totalMin) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/** "23:30" / "2330" / "23 30" → 分钟数;解析失败返回 null(键入覆盖,SPEC §2)。 */
function parseHM(raw: string): number | null {
  const match = raw.trim().match(/^(\d{1,2})[:\s]?(\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const mm = Number(match[2]);
  if (h > 23 || mm > 59) return null;
  return h * 60 + mm;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function TonightTides() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // ssr:false,挂载即在 client。默认值 = 此刻本地时间("如果现在上床"),
  // 不是空表单——呼应仪器随时汇报真实状态的身份(HOME §4.6 同源判断)。
  const [bedtime, setBedtime] = useState<number>(() => nowMinutes());
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const adjustMinutes = (delta: number) =>
    setBedtime((m) => ((m + delta) % 1440 + 1440) % 1440);

  const commitDraft = () => {
    const parsed = parseHM(draft);
    if (parsed !== null) setBedtime(parsed);
    setEditing(false);
  };

  // 潮汐场渲染:x 轴与 bedtime 无关(见文件头注释),只在挂载与 resize 时跑。
  // reduced-motion 时不起 rAF,只画一帧——不需要因 bedtime 变化而重绘。
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const noise = createNoise3D();
    const reduced = prefersReducedMotion();

    let w = 0;
    let h = 0;
    let raf = 0;

    const xForMinute = (min: number) => (min / SPAN_MIN) * w;

    const draw = (nt: number) => {
      ctx.filter = "blur(6px)";
      ctx.fillStyle = "#000";
      ctx.globalAlpha = 1;
      ctx.fillRect(0, 0, w, h);

      // 浅睡窗口高亮:区间背景带在波形下面(单一强调色,§DESIGN 2)。
      for (const win of WINDOWS) {
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = HIGHLIGHT;
        ctx.fillRect(
          xForMinute(win.startMin),
          0,
          xForMinute(win.endMin) - xForMinute(win.startMin),
          h,
        );
      }

      ctx.lineWidth = 3;
      for (let i = 0; i < WAVE_COLORS.length; i++) {
        ctx.beginPath();
        ctx.strokeStyle = WAVE_COLORS[i];
        ctx.globalAlpha = 0.5;
        for (let x = 0; x <= w; x += 4) {
          const min = (x / w) * SPAN_MIN;
          const amp = 10 + 46 * depthAt(min);
          const y = h * 0.6 + noise(x / 260, 0.3 * i, nt + i * 0.6) * amp;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.filter = "none";
    };

    const resize = () => {
      w = canvas.width = container.clientWidth;
      h = canvas.height = container.clientHeight;
      draw(2.5); // 固定相位的静态帧,resize 与 reduced-motion 共用
    };

    const frame = (now: number) => {
      draw((now / 1000) * 0.08); // 缓慢漂移——潮水没有停(策展三问③)
      raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener("resize", resize);
    if (!reduced) raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* bedtime 控件:mono 大字读数本身即控件,不用原生 time input(SPEC §2 反默认——
          原生 chrome 会击穿"无第二种彩色、无 chrome 泄漏"的纪律)。 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center p-8">
        <div className="pointer-events-auto flex items-center gap-3 font-mono">
          <span className="text-xs text-white/40">bedtime</span>
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitDraft}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitDraft();
                if (e.key === "Escape") setEditing(false);
              }}
              aria-label="type bedtime, e.g. 23:30"
              className="w-20 border-b border-green-500/40 bg-transparent text-2xl text-white outline-none focus-visible:border-green-500"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(formatHM(bedtime));
                setEditing(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  adjustMinutes(1);
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  adjustMinutes(-1);
                }
              }}
              aria-label={`bedtime ${formatHM(bedtime)}, arrow keys adjust by the minute, click to type`}
              className="text-2xl text-white underline-offset-8 transition-colors duration-200 hover:underline focus-visible:underline"
            >
              {formatHM(bedtime)}
            </button>
          )}
        </div>
      </div>

      {/* 醒来候选时间:真实 DOM 文本,可选中、可被读屏,不锁进 canvas(SPEC §2)。 */}
      <div className="pointer-events-none absolute inset-0">
        {WINDOWS.map((win) => (
          <span
            key={win.cycle}
            className="absolute bottom-6 -translate-x-1/2 whitespace-nowrap font-mono text-xs text-white/60"
            style={{ left: `${(win.centerMin / SPAN_MIN) * 100}%` }}
          >
            {formatHM(bedtime + win.centerMin)}
          </span>
        ))}
      </div>
    </div>
  );
}
