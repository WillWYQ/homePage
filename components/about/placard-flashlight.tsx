"use client";

import { useState, useSyncExternalStore } from "react";

// ① 展牌的手电筒(ABOUT-DESIGN §2)——本页唯一的签名效果(§DESIGN 10.1 账本)。
//
// 手法取自 Aceternity SVG Mask Effect,但重写为 radial-gradient 蒙版:
// 原组件是 h-screen 全屏、依赖 /mask.svg 资源、且带 dark: 明暗反转(本站无浅色模式)。
// 这里只要"一束光扫过一段展牌",那三样都不需要。
//
// 结构是两层同样的文字:
//   底层 white/15 —— 黑暗中看得出"那儿有块牌子",但读不清
//   亮层 white/70 —— 由光圈蒙版揭示,照到哪读到哪
// 光圈是访客自己在动,不自动播放——签名层预算成立(§DESIGN 2)。
//
// 降级(ABOUT §7):无 JS / reduced-motion / 触屏无精确指针 → 不挂蒙版,
// 亮层常亮 = 光圈默认全开,展牌完整可读。

const RADIUS = 120;

// 手电筒是否该挂上:精确指针 + 未要求减少动效。
// 用 useSyncExternalStore 读——SSR 快照恒为 false(服务端输出全亮的展牌),
// 客户端订阅媒体查询,访客中途改系统设置也跟得上。
const ARMING_QUERIES = ["(prefers-reduced-motion: reduce)", "(pointer: fine)"];

function subscribeToArming(onChange: () => void) {
  const lists = ARMING_QUERIES.map((q) => window.matchMedia(q));
  lists.forEach((l) => l.addEventListener("change", onChange));
  return () => lists.forEach((l) => l.removeEventListener("change", onChange));
}

function getArming() {
  return (
    !window.matchMedia(ARMING_QUERIES[0]).matches &&
    window.matchMedia(ARMING_QUERIES[1]).matches
  );
}

export function PlacardFlashlight({ text }: { text: string }) {
  const armed = useSyncExternalStore(subscribeToArming, getArming, () => false);
  const [lit, setLit] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  // 未挂蒙版 = 全亮;挂上后未悬停 = 全灭(只剩底层),悬停 = 一束光
  const mask = !armed
    ? undefined
    : lit
      ? `radial-gradient(circle ${RADIUS}px at ${pos.x}px ${pos.y}px, #000 0%, #000 45%, transparent 100%)`
      : "radial-gradient(circle 0px at 50% 50%, #000, transparent)";

  const typeClass =
    "font-serif text-xl leading-[1.75] md:text-2xl";

  return (
    <div
      className="relative"
      onPointerMove={(e) => {
        if (!armed) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onPointerEnter={() => setLit(true)}
      onPointerLeave={() => setLit(false)}
    >
      {/* 底层:黑暗中的展牌。armed 时才需要它——不然会和亮层叠成更亮的字 */}
      {armed && (
        <p aria-hidden="true" className={`${typeClass} text-white/15`}>
          {text}
        </p>
      )}
      <p
        className={`${typeClass} text-white/70 ${armed ? "absolute inset-0" : ""}`}
        style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
      >
        {text}
      </p>
    </div>
  );
}
