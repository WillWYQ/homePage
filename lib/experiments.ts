"use client";

// slug → 实验组件映射(§DESIGN 5):每个实验是 'use client' 组件,
// next/dynamic 按需加载。ssr:false 只能出现在 client 模块里,故本文件 'use client'。

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

const BreathingField = dynamic(() => import("@/components/experiments/breathing-field"), {
  ssr: false,
});

const TonightTides = dynamic(() => import("@/components/experiments/tonight-tides"), {
  ssr: false,
});

const DreamDecay = dynamic(() => import("@/components/experiments/dream-decay"), {
  ssr: false,
});

const REGISTRY: Record<string, ComponentType> = {
  "001-breathing-field": BreathingField,
  "002-tonight-tides": TonightTides,
  "003-dream-decay": DreamDecay,
};

export function experimentComponent(slug: string): ComponentType | null {
  return REGISTRY[slug] ?? null;
}
