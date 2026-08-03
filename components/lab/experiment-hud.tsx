"use client";

// 全屏实验的通用 chrome:左上 EXP 徽标 → 展开四栏记录面板(question/method/observation/instruments);
// 右上 ◂ 与 Esc 返回 /lab。声音控件住在实验本体里(谁的仪器谁出声),这里保持安静(chrome 静音)。

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { LabExperiment } from "@/lib/content";
import { t, type Locale } from "@/lib/i18n/strings";

export function ExperimentHUD({
  experiment,
  locale,
}: {
  experiment: LabExperiment;
  locale: Locale;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push("/lab");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col p-6 font-mono text-xs">
      {/* 顶行:徽标(可点,展开记录面板);右侧 = 快捷键提示 + 返回 */}
      <div className="flex items-start justify-between">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="pointer-events-auto text-left text-white/70 underline-offset-4 transition-colors duration-200 hover:text-white focus-visible:text-white"
        >
          EXP-{experiment.exp} · {experiment.title}
        </button>
        <div className="flex items-start gap-4">
          <span className="text-white/40">m · Esc</span>
          <Link
            href="/lab"
            className="pointer-events-auto text-white/60 underline-offset-4 transition-colors duration-200 hover:text-white hover:underline focus-visible:text-white"
          >
            ◂ {t("lab.back", locale)}
          </Link>
        </div>
      </div>

      {/* 四栏记录面板(§DESIGN 5):方法与器材必须可复查——不许假。 */}
      {open && (
        <div className="pointer-events-auto mt-4 max-w-xl border border-white/10 bg-black/70 p-4 backdrop-blur-sm">
          <dl className="space-y-3">
            <div>
              <dt className="text-white/40">{t("lab.record.question", locale)}</dt>
              <dd className="mt-1 font-sans text-white/70">{experiment.question}</dd>
            </div>
            <div>
              <dt className="text-white/40">{t("lab.record.method", locale)}</dt>
              <dd className="mt-1 font-sans text-white/70">{experiment.method}</dd>
            </div>
            <div>
              <dt className="text-white/40">{t("lab.record.observation", locale)}</dt>
              <dd className="mt-1 font-sans text-white/70">{experiment.observation}</dd>
            </div>
            <div>
              <dt className="text-white/40">{t("lab.record.instruments", locale)}</dt>
              <dd className="mt-1 text-white/70">{experiment.instruments.join(" · ")}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
