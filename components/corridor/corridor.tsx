"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { WavyBackground } from "@/components/ui/wavy-background";
import { SiteFooter } from "@/components/site-footer";
import { CorridorNav } from "./corridor-nav";
import { CorridorReadout } from "./corridor-readout";
import { LAMP_BY_BAND, useNightBand } from "./use-night-band";
import { INTRO_SEEN_KEY } from "@/lib/site";
import { openRooms, type RoomId } from "@/lib/rooms";
import type { LatestEntry, RoomStatuses } from "@/lib/content";
import { formatLastEntry, formatPeek, t, type Locale } from "@/lib/i18n/strings";

// 走廊(HOME-DESIGN):门厅(第一次)/枢纽(之后)/仪器(读时刻、报库存)三个身份。
// 本壳层持有:开场状态机(§3.1)、唯一时钟(useNightBand)、门缝读数的悬停态。

// 懒加载:intro 不播的会话(回访 / reduced-motion)不下载 Vortex 代码
const IntroOverlay = dynamic(() => import("./intro-overlay"), { ssr: false });

type IntroState = "pending" | "playing" | "gone";

export function Corridor({
  title,
  tagline,
  latestEntry,
  roomStatuses,
  locale = "canonical",
}: {
  title: string;
  tagline: string;
  latestEntry: LatestEntry | null;
  roomStatuses: RoomStatuses;
  locale?: Locale;
}) {
  // 开场状态机(§3.1):overlay 只在客户端 mount 后渲染,SSR HTML 里没有它——
  // 无 JS 访客直接看到走廊;播放条件不满足则直接 gone
  const [intro, setIntro] = useState<IntroState>("pending");
  useEffect(() => {
    let seen = false;
    try {
      seen = !!window.sessionStorage.getItem(INTRO_SEEN_KEY);
    } catch {
      // 读不到就当没看过:代价只是多演一次
    }
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    setIntro(!seen && !reducedMotion ? "playing" : "gone");
  }, []);

  // 唯一时钟:读数文案、灯档、04:04 三处消费同一份时刻(§7)
  const { now, band, hhmm, is0404 } = useNightBand();
  const lamp = LAMP_BY_BAND[band];

  const clockLine = !hhmm
    ? null
    : is0404
      ? t("readout.0404", locale)
      : `${hhmm} · ${t(`readout.band.${band}`, locale)}`;
  const latestLine =
    now && latestEntry ? ` · ${formatLastEntry(latestEntry, now, locale)}` : null;

  // 门缝读数(§4.3 ③):悬停态在此,数据在构建期,格式化在字典
  const [peeked, setPeeked] = useState<RoomId | null>(null);
  const peekLine =
    peeked && now ? formatPeek(peeked, roomStatuses, now, locale) : null;

  return (
    <div className="relative">
      {intro === "playing" && (
        <IntroOverlay locale={locale} onDone={() => setIntro("gone")} />
      )}

      <main className="relative z-10">
        <WavyBackground
          containerClassName="h-dvh bg-black"
          speedFactor={lamp.speedFactor}
          opacityFactor={lamp.opacityFactor}
        >
          {/* 直接抵达时 200ms 淡入(§4.1);intro 播放时被 overlay 盖住,揭幕即入场 */}
          <div className="corridor-enter px-6 text-center">
            <h1 className="text-4xl text-white md:text-5xl">{title}</h1>
            <p className="mt-4 text-lg text-white/70">{tagline}</p>
            <CorridorNav rooms={openRooms()} onPeek={setPeeked} />
          </div>
        </WavyBackground>

        <CorridorReadout
          clockLine={clockLine}
          latestLine={latestLine}
          peekLine={peekLine}
        />
        <SiteFooter locale={locale} />
      </main>
    </div>
  );
}
