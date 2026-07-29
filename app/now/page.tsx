import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoomShell } from "@/components/room-shell";
import { getNow } from "@/lib/content";
import { t, type Locale } from "@/lib/i18n/strings";
import { isWillsleep } from "@/lib/site";

// /now — 值班表(§DESIGN 5)。
// 签名效果:无。这是全站最短的一页,它接受"默认答案是没有"(§DESIGN 10.1 账本)。
// 它的性格来自克制本身,不来自演出。

// 房间名不外泄到 yueqiao 构建(红线 2 的身份切分):那边这条路由只是一个 404
export const metadata: Metadata = isWillsleep
  ? { title: "now · The Sleep Lab", description: "最近在折腾 / 在读 / 在想 / 在听" }
  : { title: "Not found · Yueqiao Dev" };

export default function NowPage({ locale = "canonical" }: { locale?: Locale }) {
  // 双站门控(§DESIGN 8):yueqiao 构建不出新板块
  if (!isWillsleep) notFound();

  const now = getNow();
  if (!now) notFound();

  return (
    <RoomShell room="now" locale={locale}>
      {/* 本页唯一的仪表位,已被 last updated 占用(HOME §9 的 night N 因此出局) */}
      {now.updated && (
        <p className="font-mono text-xs text-white/40">
          {t("now.lastUpdated", locale)}: {now.updated.slice(0, 10)}
        </p>
      )}

      <div className="mt-12 space-y-12">
        {now.sections.map((section) => (
          <section key={section.id}>
            <h2 className="font-mono text-xs text-white/40">
              {t(`now.section.${section.id}`, locale)}
            </h2>
            <ul className="mt-6 space-y-3 font-sans text-white/70">
              {section.items.map((item, i) => (
                <li key={i} className="leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {now.paragraphs.length > 0 && (
        <div className="mt-24 space-y-6 font-serif leading-[1.75] text-white/70">
          {now.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}
    </RoomShell>
  );
}
