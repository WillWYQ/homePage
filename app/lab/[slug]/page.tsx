import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExperimentHUD } from "@/components/lab/experiment-hud";
import { ExperimentStage } from "@/components/lab/experiment-stage";
import { getLabExperiment, getLabExperiments } from "@/lib/content";
import { isWillsleep } from "@/lib/site";
import type { Locale } from "@/lib/i18n/strings";

// /lab/[slug] — 单个实验,全屏交互(§DESIGN 5)。
// 静态导出:动态路由必须 generateStaticParams + dynamicParams=false。

export const dynamicParams = false;

export function generateStaticParams() {
  return getLabExperiments().map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  if (!isWillsleep) return { title: "Not found · Yueqiao Dev" };
  const { slug } = await params;
  const e = getLabExperiment(slug);
  if (!e) return { title: "Not found · The Sleep Lab" };
  return { title: `EXP-${e.exp} · ${e.title} · The Sleep Lab`, description: e.question };
}

export default async function LabExperimentPage({
  params,
  locale = "canonical",
}: {
  params: Promise<{ slug: string }>;
  locale?: Locale;
}) {
  // 双站门控:yueqiao 构建这条路由只是 404(红线 2 身份切分)。
  if (!isWillsleep) notFound();
  const { slug } = await params;
  const experiment = getLabExperiment(slug);
  if (!experiment) notFound();

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <ExperimentStage slug={experiment.slug} />
      <ExperimentHUD experiment={experiment} locale={locale} />
    </div>
  );
}
