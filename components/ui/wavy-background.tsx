"use client";
import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";
import { createNoise3D } from "simplex-noise";

export const WavyBackground = ({
  children,
  className,
  containerClassName,
  colors,
  waveWidth,
  backgroundFill,
  blur = 10,
  speed = "fast",
  waveOpacity = 0.5,
  speedFactor = 1,
  opacityFactor = 1,
  ...props
}: {
  children?: any;
  className?: string;
  containerClassName?: string;
  colors?: string[];
  waveWidth?: number;
  backgroundFill?: string;
  blur?: number;
  speed?: "slow" | "fast";
  waveOpacity?: number;
  /** 分时段调光(HOME-DESIGN §4.6):作用于基准速度的系数,基准参数不动 */
  speedFactor?: number;
  /** 分时段调光:作用于基准波形透明度的系数 */
  opacityFactor?: number;
  [key: string]: any;
}) => {
  const noise = createNoise3D();
  let w: number,
    h: number,
    nt: number,
    i: number,
    x: number,
    ctx: any,
    canvas: any;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // 系数走 ref 进渲染循环:档位切换不重启 canvas(跨档瞬时,不做过渡)
  const factorsRef = useRef({ speed: speedFactor, opacity: opacityFactor });
  const drawStaticFrameRef = useRef<(() => void) | null>(null);

  const getSpeed = () => {
    switch (speed) {
      case "slow":
        return 0.001;
      case "fast":
        return 0.002;
      default:
        return 0.001;
    }
  };

  const init = () => {
    canvas = canvasRef.current;
    ctx = canvas.getContext("2d");
    w = ctx.canvas.width = window.innerWidth;
    h = ctx.canvas.height = window.innerHeight;
    ctx.filter = `blur(${blur}px)`;
    nt = 0;
    // reduced-motion:画一帧后停(§DESIGN 2);首帧亮度仍按时段取值(§4.6)
    const staticFrame = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    window.onresize = function () {
      w = ctx.canvas.width = window.innerWidth;
      h = ctx.canvas.height = window.innerHeight;
      ctx.filter = `blur(${blur}px)`;
      if (staticFrame) drawStaticFrameRef.current?.();
    };
    if (staticFrame) {
      drawStaticFrameRef.current = () => {
        // 单帧没有逐帧叠加,先铺不透明底,避免半透明背景漏色
        ctx.globalAlpha = 1;
        ctx.fillStyle = backgroundFill || "black";
        ctx.fillRect(0, 0, w, h);
        // 单帧不叠加,所以不乘 waveOpacity(那是给逐帧累积用的衰减量)——
        // 直接用灯档系数当亮度,否则 day 档 0.5×0.45 打在纯黑上几乎看不见
        ctx.globalAlpha = factorsRef.current.opacity;
        drawWave(5);
      };
      drawStaticFrameRef.current();
    } else {
      render();
    }
  };

  const waveColors = colors ?? [
    "#38bdf8",
    "#818cf8",
    "#c084fc",
    "#e879f9",
    "#22d3ee",
  ];
  const drawWave = (n: number) => {
    nt += getSpeed() * factorsRef.current.speed;
    // 亮度由调用方通过 globalAlpha 设定(逐帧路径与单帧路径的基数不同)
    for (i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.lineWidth = waveWidth || 50;
      ctx.strokeStyle = waveColors[i % waveColors.length];
      for (x = 0; x < w; x += 5) {
        var y = noise(x / 800, 0.3 * i, nt) * 100;
        ctx.lineTo(x, y + h * 0.5); // adjust for height, currently at 50% of the container
      }
      ctx.stroke();
      ctx.closePath();
    }
  };

  let animationId: number;
  const render = () => {
    // 两个 alpha 管两件不相干的事,不能共用一个(HOME-DESIGN §4.6):
    // ① 铺底黑的浓度 = 残影衰减速度,与灯亮不亮无关,恒为基准值
    ctx.fillStyle = backgroundFill || "black";
    ctx.globalAlpha = waveOpacity || 0.5;
    ctx.fillRect(0, 0, w, h);
    // ② 波形描边的浓度 = 灯的亮度,这里才该乘灯档系数
    ctx.globalAlpha = (waveOpacity || 0.5) * factorsRef.current.opacity;
    drawWave(5);
    animationId = requestAnimationFrame(render);
  };

  useEffect(() => {
    init();
    return () => {
      cancelAnimationFrame(animationId);
      window.onresize = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 档位切换:更新系数;静态帧模式下重画一帧让新亮度生效
  useEffect(() => {
    factorsRef.current = { speed: speedFactor, opacity: opacityFactor };
    drawStaticFrameRef.current?.();
  }, [speedFactor, opacityFactor]);

  const [isSafari, setIsSafari] = useState(false);
  useEffect(() => {
    // I'm sorry but i have got to support it on safari.
    setIsSafari(
      typeof window !== "undefined" &&
        navigator.userAgent.includes("Safari") &&
        !navigator.userAgent.includes("Chrome")
    );
  }, []);

  return (
    <div
      className={cn(
        "h-screen flex flex-col items-center justify-center",
        containerClassName
      )}
    >
      <canvas
        className="absolute inset-0 z-0"
        ref={canvasRef}
        id="canvas"
        style={{
          ...(isSafari ? { filter: `blur(${blur}px)` } : {}),
        }}
      ></canvas>
      <div className={cn("relative z-10", className)} {...props}>
        {children}
      </div>
    </div>
  );
};
