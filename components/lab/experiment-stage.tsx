"use client";

// /lab/[slug] 的全屏壳:按 slug 从注册表取实验组件渲染。
// 持续运动的 canvas 只许存在于 /lab/[slug] 全屏页内(§DESIGN 2 动效预算)——就是这里。

import { experimentComponent } from "@/lib/experiments";

export function ExperimentStage({ slug }: { slug: string }) {
  // experimentComponent looks up a stable reference from a module-level
  // registry (lib/experiments.ts); it never defines a new component, so the
  // identity is stable across renders even though the lookup runs at render time.
  const Experiment = experimentComponent(slug);
  if (!Experiment) return null;
  return (
    <div className="absolute inset-0">
      {/* eslint-disable-next-line react-hooks/static-components -- see above */}
      <Experiment />
    </div>
  );
}
