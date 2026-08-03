import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LabGrid } from "@/components/lab/lab-grid";
import { RoomShell } from "@/components/room-shell";
import { getLabExperiments } from "@/lib/content";
import { isWillsleep } from "@/lib/site";
import type { Locale } from "@/lib/i18n/strings";

// /lab — 实验区索引(§DESIGN 5)。签名 = Focus Cards(见 lab-grid)。
// 红线 3:没有实验就 404,不放占位。

export const metadata: Metadata = isWillsleep
  ? { title: "lab · The Sleep Lab", description: "编号实验:用仪器研究睡眠、夜与记忆" }
  : { title: "Not found · Yueqiao Dev" };

export default function LabPage({ locale = "canonical" }: { locale?: Locale }) {
  if (!isWillsleep) notFound();
  const experiments = getLabExperiments();
  if (experiments.length === 0) notFound();

  return (
    // className 覆盖 RoomShell 默认的 max-w-2xl,给网格更宽的版面(twMerge 收敛)。
    <RoomShell room="lab" locale={locale} className="max-w-4xl">
      <LabGrid experiments={experiments} locale={locale} />
    </RoomShell>
  );
}
