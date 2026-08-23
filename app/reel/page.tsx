import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RoomShell } from "@/components/room-shell";
import { ReelSleeve } from "@/components/reel/reel-sleeve";
import { getReel } from "@/lib/content";
import { t, type Locale } from "@/lib/i18n/strings";
import { isWillsleep } from "@/lib/site";

// /reel — 卷带间(docs/superpowers/specs/2026-08-21-reel-room-design.md)。
// 精选(策展式)与日志(时间序)两段独立门控:任一段有内容就渲染,两段皆空
// (或文件不存在)按现有"内容单元不存在"规则 404,与 /now、/about 同构(§1)。
// 签名效果:无(§7)——克制感与 /now、/notes 同源。

// 房间名不外泄到 yueqiao 构建(红线 2 的身份切分):那边这条路由只是一个 404
export const metadata: Metadata = isWillsleep
  ? {
      title: "reel · The Sleep Lab",
      description: "精选与日志:反复回去听的 / 这段时间在听什么",
    }
  : { title: "Not found · Yueqiao Dev" };

export default function ReelPage({ locale = "canonical" }: { locale?: Locale }) {
  if (!isWillsleep) notFound();

  const reel = getReel();
  if (!reel || (reel.favorites.length === 0 && reel.log.length === 0)) notFound();

  return (
    <RoomShell room="reel" locale={locale}>
      {reel.favorites.length > 0 && (
        <section>
          <h2 className="font-mono text-xs text-white/40">
            {t("reel.section.favorites", locale)}
          </h2>
          <ul className="mt-6 space-y-3 font-sans">
            {reel.favorites.map((item, i) => (
              <li key={i}>
                {item.href ? (
                  <a
                    href={item.href}
                    rel="noreferrer"
                    target="_blank"
                    className="group block"
                  >
                    {item.sleeve && <ReelSleeve src={item.sleeve} />}
                    <p className="leading-relaxed text-white/70 underline underline-offset-4 transition-colors duration-200 group-hover:text-white group-focus-visible:text-white">
                      {item.title}
                    </p>
                  </a>
                ) : (
                  <>
                    {item.sleeve && <ReelSleeve src={item.sleeve} />}
                    <p className="leading-relaxed text-white/70">{item.title}</p>
                  </>
                )}
                {item.note && <p className="mt-1 text-white/40">{item.note}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {reel.log.length > 0 && (
        <section className={reel.favorites.length > 0 ? "mt-24" : undefined}>
          <h2 className="font-mono text-xs text-white/40">
            {t("reel.section.log", locale)}
          </h2>
          <ul className="mt-6 space-y-3 font-sans">
            {reel.log.map((entry, i) => (
              <li key={i}>
                <p className="font-mono text-xs text-white/40">
                  {entry.date.slice(0, 10)}
                </p>
                <p className="mt-1 leading-relaxed text-white/70">
                  {entry.text}
                  {entry.ref && (
                    <>
                      {" "}
                      <Link
                        href={entry.ref}
                        className="font-mono text-xs text-white/60 underline-offset-4 transition-colors duration-200 hover:text-white hover:underline focus-visible:text-white focus-visible:underline"
                      >
                        {entry.ref}
                      </Link>
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </RoomShell>
  );
}
