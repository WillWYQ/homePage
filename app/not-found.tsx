import type { Metadata } from "next";
import { SpecimenShelf } from "@/components/specimen-shelf";
import { isWillsleep } from "@/lib/site";

// 404 — 标本架(§DESIGN 5)。GitHub Pages 用构建产物 404.html。
// 红线 3 的例外只有这里:404 不是 "coming soon" 占位页,它是一个房间。
//
// 双站门控(§DESIGN 8):标本架是 willsleep 的房间——它的罐子就是那个站的地图,
// 连"走廊"这个词都是那栋楼的方言。yueqiao 构建给一行素的,不外泄任何房间。

export const metadata: Metadata = isWillsleep
  ? { title: "specimen missing · The Sleep Lab" }
  : { title: "Not found · Yueqiao Dev" };

export default function NotFound() {
  if (!isWillsleep) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black px-6">
        <p className="font-mono text-xs text-white/40">404 — not found</p>
      </div>
    );
  }

  return <SpecimenShelf />;
}
