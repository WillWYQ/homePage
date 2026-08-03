"use client";

// /lab/[slug] 的全屏壳:按 slug 从注册表取实验组件渲染。
// 持续运动的 canvas 只许存在于 /lab/[slug] 全屏页内(§DESIGN 2 动效预算)——就是这里。

import { experimentComponent } from "@/lib/experiments";

export function ExperimentStage({ slug }: { slug: string }) {
  const Experiment = experimentComponent(slug);
  if (!Experiment) return null;
  return (
    <div className="absolute inset-0">
      <Experiment />
    </div>
  );
}
