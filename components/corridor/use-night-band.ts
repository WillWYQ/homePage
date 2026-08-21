"use client";

import { useEffect, useState } from "react";

// 走廊的唯一时钟(HOME-DESIGN §7):读数文案、灯档、04:04 三处消费同一份时刻,永不漂移。
// SSR 期 now 为 null(读数整行不出现,避免水合不匹配);mount 后每分钟对齐刷新。

export type NightBand = "night" | "deep" | "dawn" | "day" | "evening";

export function bandOf(hour: number): NightBand {
  if (hour >= 22 || hour < 2) return "night";
  if (hour < 5) return "deep";
  if (hour < 9) return "dawn";
  if (hour < 17) return "day";
  return "evening";
}

// 分时段的灯(HOME-DESIGN §4.6):深夜最亮、白天最暗——档位结构是规格,数值可微调
export const LAMP_BY_BAND: Record<
  NightBand,
  { speedFactor: number; opacityFactor: number }
> = {
  night: { speedFactor: 1, opacityFactor: 1 },
  deep: { speedFactor: 0.6, opacityFactor: 0.8 },
  dawn: { speedFactor: 0.4, opacityFactor: 0.6 },
  day: { speedFactor: 0.25, opacityFactor: 0.45 },
  evening: { speedFactor: 0.8, opacityFactor: 0.9 },
};

export function useNightBand() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // 必须等 mount 后才能读真实时间(SSR 期 now 为 null,避免水合不匹配,见上方
    // 注释)——React 团队认可的"读浏览器专属 API"例外场景。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    let timer: number;
    const schedule = () => {
      const d = new Date();
      const msToNextMinute =
        60_000 - (d.getSeconds() * 1_000 + d.getMilliseconds());
      timer = window.setTimeout(() => {
        setNow(new Date());
        schedule();
      }, msToNextMinute + 50);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, []);

  // mount 前灯用基准档(night);canvas 本就在 mount 后才起步,不会被访客察觉
  const band: NightBand = now ? bandOf(now.getHours()) : "night";
  const hhmm = now
    ? `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}`
    : null;
  const is0404 = now ? now.getHours() === 4 && now.getMinutes() === 4 : false;

  return { now, band, hhmm, is0404 };
}
