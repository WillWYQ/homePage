"use client";

import { useEffect, useState } from "react";
import { Vortex } from "@/components/ui/vortex";
import { EncryptedText } from "@/components/ui/encrypted-text";
import { INTRO_SEEN_KEY } from "@/lib/site";
import { t, type Locale } from "@/lib/i18n/strings";

// 开场仪式(HOME-DESIGN §3):入楼一晚只演一次。
// 播放条件由走廊壳层判定(sessionStorage / reduced-motion / willsleep 构建 / 已 mount),
// 本组件只负责 playing → fading → gone 的后半程。
// 整个组件经 next/dynamic 懒加载:回访者(intro 不播)不下载 Vortex 的代码。

// text reveal takes ~1.3s (26 chars x 50ms); leave a beat before fading out
const INTRO_DURATION_MS = 3500;
const INTRO_FADE_MS = 700;
// 播放 ~1.8s 后淡入跳过提示:第一次来的人不该猜"能不能跳"(§3.2)
const SKIP_HINT_DELAY_MS = 1800;

export default function IntroOverlay({
  locale = "canonical",
  onDone,
}: {
  locale?: Locale;
  onDone: () => void;
}) {
  const [fading, setFading] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (fading) return;
    const dismiss = () => setFading(true);
    const events = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
    const timer = setTimeout(dismiss, INTRO_DURATION_MS);
    events.forEach((event) =>
      window.addEventListener(event, dismiss, { passive: true })
    );
    return () => {
      clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, dismiss));
    };
  }, [fading]);

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(true), SKIP_HINT_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // sessionStorage 写在开始淡出时(不是播完时),跳过也算看过(§3.2)
  useEffect(() => {
    if (!fading) return;
    try {
      window.sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch {
      // Safari 隐私模式等场景写不进去:代价只是同一会话内重播,可接受
    }
    const timer = setTimeout(onDone, INTRO_FADE_MS);
    return () => clearTimeout(timer);
  }, [fading, onDone]);

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-50 transition-opacity duration-700 ${
        fading ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <Vortex
        backgroundColor="black"
        rangeY={500}
        className="flex h-full w-full items-center justify-center"
      >
        <div className="text-center">
          <EncryptedText
            text="Living outside the bitmask"
            encryptedClassName="text-green-500"
            revealedClassName="dark:text-grey text-white text-4xl"
            revealDelayMs={50}
          />
        </div>
      </Vortex>
      <div
        className={`absolute inset-x-0 bottom-10 text-center font-mono text-xs text-white/30 transition-opacity duration-700 ${
          showHint && !fading ? "opacity-100" : "opacity-0"
        }`}
      >
        {t("intro.skipHint", locale)}
      </div>
    </div>
  );
}
