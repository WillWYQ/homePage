import { Corridor } from "@/components/corridor/corridor";
import { WavyBackground } from "@/components/ui/wavy-background";
import { getLatestEntry, getRoomStatuses } from "@/lib/content";
import { isWillsleep, SITE_COPY, siteName } from "@/lib/site";

// / — 走廊(HOME-DESIGN)。薄壳:构建期取数,页面本体在 components/corridor/。

export default function Home() {
  const copy = SITE_COPY[siteName] || SITE_COPY.willsleep;

  // yueqiao 构建保留现状占位(§6):无 intro、无导航、无读数、无 career 链接
  if (!isWillsleep) {
    return (
      <main className="relative z-10">
        <WavyBackground containerClassName="h-dvh bg-black">
          <div className="px-6 text-center">
            <h1 className="text-4xl text-white md:text-5xl">{copy.title}</h1>
            <p className="mt-4 text-lg text-white/70">{copy.tagline}</p>
          </div>
        </WavyBackground>
      </main>
    );
  }

  return (
    <Corridor
      title={copy.title}
      tagline={copy.tagline}
      latestEntry={getLatestEntry()}
      roomStatuses={getRoomStatuses()}
    />
  );
}
