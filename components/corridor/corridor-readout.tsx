"use client";

import { cn } from "@/lib/utils";
import { useRef } from "react";

// 仪表读数(HOME-DESIGN §4.3):左上角一行 mono,墙上的钟 + 门房的登记簿。
// 永不做成列表;门缝读数(peek)来临时整行交叉淡入(≤150ms),移开即回到时钟。
// SSR 期整行不渲染(壳层传 null),避免水合不匹配;不设 aria-live——
// 每分钟的时钟更新与悬停换行都不该被朗读,屏幕阅读器语义以导航链接本身为准。

export function CorridorReadout({
  clockLine,
  latestLine,
  peekLine,
}: {
  /** `03:12 · you're in the right place`(04:04 彩蛋已在壳层替换);null = 未 mount */
  clockLine: string | null;
  /** ` · last entry: REM-007, two nights ago`;无内容时 null,整段省略 */
  latestLine: string | null;
  /** 门缝读数;null = 未悬停或该房间无数据(时钟继续走) */
  peekLine: string | null;
}) {
  // 淡出过程中保留最后一次的门缝文字,避免尾帧闪空
  const lastPeekRef = useRef<string | null>(null);
  if (peekLine) lastPeekRef.current = peekLine;

  if (!clockLine) return null;

  return (
    <div className="pointer-events-none absolute left-6 right-6 top-6 z-20 font-mono text-xs text-white/40">
      <div className="relative">
        <p
          className={cn(
            "truncate transition-opacity duration-150 motion-reduce:transition-none",
            peekLine ? "opacity-0" : "opacity-100"
          )}
        >
          {clockLine}
          {latestLine && <span className="hidden sm:inline">{latestLine}</span>}
        </p>
        <p
          aria-hidden={!peekLine}
          className={cn(
            "absolute inset-0 truncate transition-opacity duration-150 motion-reduce:transition-none",
            peekLine ? "opacity-100" : "opacity-0"
          )}
        >
          {lastPeekRef.current}
        </p>
      </div>
    </div>
  );
}
