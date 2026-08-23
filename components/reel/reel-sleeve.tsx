"use client";

import { useEffect, useRef, useState } from "react";

// 精选卡片的封面图(spec §5):加载失败时优雅降级为纯文字卡,不留破图占位。
// "缺失"由调用方(sleeve 为空就不渲染这个组件)处理;这里只处理"加载失败"——
// 裸 <img> 没有 onError 钩子可挂在 Server Component 里,所以单独拆出这个
// client component(同 placard-flashlight.tsx 的取舍:一个组件只担一件交互)。
//
// 静态导出下浏览器在 hydrate 前就已经开始取图,加载失败可能先于 onError
// 监听器挂上就已经发生(<img> 的 error 事件不冒泡,React 不会补放 hydrate
// 前的事件)——所以额外用 effect 补一次"已经错误"的检测。

export function ReelSleeve({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setFailed(true);
    }
  }, []);

  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={src}
      alt=""
      className="mb-3 aspect-square w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}
