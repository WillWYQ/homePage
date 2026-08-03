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
