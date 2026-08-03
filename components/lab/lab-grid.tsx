import Link from "next/link";
import type { LabExperiment } from "@/lib/content";
import { t, type Locale } from "@/lib/i18n/strings";

// /lab 索引网格(§DESIGN 5)。签名 = Focus Cards:hover 聚焦一张、其余暗化,
// 纯 CSS(globals.css 的 .focus-cards / .focus-card),无 JS、无 live canvas。
// 卡片:EXP 编号(mono 读数)+ 名称 + 一个问句 + 状态。空旷合法(红线 3)。

export function LabGrid({
  experiments,
  locale,
}: {
  experiments: LabExperiment[];
  locale: Locale;
}) {
  return (
    <ul className="focus-cards grid gap-6 sm:grid-cols-2">
      {experiments.map((e) => (
        <li key={e.slug} className="focus-card">
          <Link
            href={`/lab/${e.slug}/`}
            className="block border border-white/10 bg-white/[0.02] p-6 transition-colors duration-200 hover:border-green-500/40 focus-visible:border-green-500/40"
          >
            {e.poster && (
              // 静态海报(非 live canvas)。public/ 下,裸 <img> 即可(§DESIGN 5/photos)。
              // eslint-disable-next-line @next/next/no-img-element
              <img src={e.poster} alt="" className="mb-4 w-full opacity-80" />
            )}
            <p className="font-mono text-xs text-white/40">EXP-{e.exp}</p>
            <h2 className="mt-1 font-sans text-lg text-white">{e.title}</h2>
            <p className="mt-2 font-sans text-white/70">{e.question}</p>
            <p className="mt-4 font-mono text-xs text-white/40">
              {t(`lab.status.${e.status}`, locale)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
