import Link from "next/link";
import type { RoomId } from "@/lib/rooms";

// 子页统一顶栏(§DESIGN 3):一行 mono,左 `◂ the sleep lab` 回走廊,右当前房间名。
// 无汉堡菜单、无全局导航——房间之间经走廊中转,这本身是设计的一部分。
//
// 左侧是交互性 mono(门牌级),走 white/60;右侧房间名是读数,走 white/40
// ——§DESIGN 2 仪器排版的管辖边界:一行里出现两种灰是对的。

export function RoomHeader({ room }: { room: RoomId }) {
  return (
    <header className="flex items-baseline justify-between px-6 pt-6 font-mono text-xs">
      <Link
        href="/"
        className="text-white/60 underline-offset-4 transition-colors duration-200 hover:text-white hover:underline focus-visible:text-white focus-visible:underline"
      >
        ◂ the sleep lab
      </Link>
      <span className="text-white/40">{room}</span>
    </header>
  );
}
