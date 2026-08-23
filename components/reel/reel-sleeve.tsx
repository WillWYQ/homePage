"use client";

import { useState } from "react";

// 精选卡片的封面图(spec §5):加载失败时优雅降级为纯文字卡,不留破图占位。
// "缺失"由调用方(sleeve 为空就不渲染这个组件)处理;这里只处理"加载失败"——
// 裸 <img> 没有 onError 钩子可挂在 Server Component 里,所以单独拆出这个
// client component(同 placard-flashlight.tsx 的取舍:一个组件只担一件交互)。

export function ReelSleeve({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      src={src}
      alt=""
      className="mb-3 aspect-square w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}
