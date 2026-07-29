import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoomShell } from "@/components/room-shell";
import { PlacardFlashlight } from "@/components/about/placard-flashlight";
import { getAbout } from "@/lib/content";
import { t, type Locale } from "@/lib/i18n/strings";
import { isWillsleep } from "@/lib/site";

// /about — 驻留研究员(ABOUT-DESIGN)。
// 不是"自我介绍",是一份研究员档案:别人(以及仪器)如何记录他,他本人只负责批注。
// 签名效果只有展牌手电筒;② 自画像是静态印版,不占第二个额度(§DESIGN 10.1)。
// 红线:本页不出现技能列表/工作经历/项目成就,正文不提职业身份(§1 红线 1、2)。

// 房间名不外泄到 yueqiao 构建(红线 2 的身份切分):那边这条路由只是一个 404
export const metadata: Metadata = isWillsleep
  ? { title: "about · The Sleep Lab", description: "本馆唯一常驻研究员的观察记录" }
  : { title: "Not found · Yueqiao Dev" };

/** 分节标题:mono 刻度名,属读数(§DESIGN 2 white/40)。 */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="font-mono text-xs text-white/40">{children}</h2>;
}

export default function AboutPage({
  locale = "canonical",
}: {
  locale?: Locale;
}) {
  if (!isWillsleep) notFound();

  const about = getAbout();
  if (!about) notFound();

  return (
    <RoomShell room="about" locale={locale}>
      {/* ① 展牌 —— 手电筒照到哪读到哪 */}
      <PlacardFlashlight text={about.placard} />

      {/* ② 自画像:静态 ASCII 印版。没有就整段不渲染,不放占位(红线 3)。
          字号不受 §DESIGN 2 仪器排版管辖——这里的 mono 是画布不是读数,
          字符在此是像素,行高压到 1.15 才能成像。 */}
      {about.portrait && (
        <figure className="mt-24">
          <pre
            aria-hidden="true"
            className="overflow-x-auto font-mono text-[10px] leading-[1.15] text-white/40"
          >
            {about.portrait}
          </pre>
          {about.portraitAlt && (
            <figcaption className="sr-only">{about.portraitAlt}</figcaption>
          )}
        </figure>
      )}

      {/* ③ 观察记录 */}
      {about.observers.length > 0 && (
        <section className="mt-24">
          <SectionLabel>{t("about.observers", locale)}</SectionLabel>

          {about.epigraph && (
            <p className="mt-6 font-mono text-xs text-white/40">
              {about.epigraph}
            </p>
          )}

          <ul className="mt-12 space-y-12">
            {about.observers.map((o, i) => (
              <li key={i}>
                {/* 元信息行:证据等级标签本身就是实验室美学的一部分(ABOUT §3.1) */}
                <p className="font-mono text-xs text-white/40">
                  observer #{o.id}
                  {o.date && ` · ${o.date.slice(0, 10)}`}
                  {o.grade && ` · [${o.grade}]`}
                </p>
                {/* 引语用衬线体:证词是被阅读的(§DESIGN 2) */}
                <blockquote className="mt-3 font-serif leading-[1.75] text-white/70">
                  「{o.quote}」
                </blockquote>
                {o.note && (
                  <p className="mt-3 pl-6 font-mono text-xs text-white/40">
                    ↳ {t("about.annotation", locale)}:{o.note}
                  </p>
                )}
              </li>
            ))}
          </ul>

          {about.curatorNote && (
            <p className="mt-12 border-l border-white/10 pl-6 font-mono text-xs leading-[1.75] text-white/40">
              {about.curatorNote}
            </p>
          )}
        </section>
      )}

      {/* ④ 命名注释 —— 站名的谜面保持不解 */}
      {about.naming.length > 0 && (
        <section className="mt-24">
          <SectionLabel>{t("about.naming", locale)}</SectionLabel>
          <ul className="mt-12 space-y-6">
            {about.naming.map((n, i) => (
              <li key={i}>
                <blockquote className="font-serif leading-[1.75] text-white/70">
                  「{n.quote}」
                </blockquote>
                {n.grade && (
                  <p className="mt-1 font-mono text-xs text-white/40">
                    [{n.grade}]
                  </p>
                )}
              </li>
            ))}
          </ul>
          {about.namingNote && (
            <p className="mt-12 font-mono text-xs text-white/40">
              {about.namingNote}
            </p>
          )}
        </section>
      )}

      {/* ⑤ 收藏架:纯文字,不放封面图(ABOUT §4) */}
      {about.shelves.length > 0 && (
        <section className="mt-24">
          <SectionLabel>{t("about.shelves", locale)}</SectionLabel>
          <div className="mt-12 space-y-12">
            {about.shelves.map((shelf) => (
              <div key={shelf.id}>
                <h3 className="font-mono text-xs text-white/40">{shelf.id}</h3>
                <ul className="mt-6 space-y-3 font-sans">
                  {shelf.items.map((item, i) => (
                    <li key={i} className="leading-relaxed">
                      {item.href ? (
                        <a
                          href={item.href}
                          rel="noreferrer"
                          target="_blank"
                          className="text-white/70 underline underline-offset-4 transition-colors duration-200 hover:text-white focus-visible:text-white"
                        >
                          {item.title}
                        </a>
                      ) : (
                        <span className="text-white/70">{item.title}</span>
                      )}
                      {item.note && (
                        <span className="text-white/40"> — {item.note}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {about.paragraphs.length > 0 && (
        <div className="mt-24 space-y-6 font-serif leading-[1.75] text-white/70">
          {about.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}
    </RoomShell>
  );
}
