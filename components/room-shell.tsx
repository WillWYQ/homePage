import { RoomHeader } from "@/components/room-header";
import { SiteFooter } from "@/components/site-footer";
import type { Locale } from "@/lib/i18n/strings";
import type { RoomId } from "@/lib/rooms";
import { cn } from "@/lib/utils";

// 房间外壳:顶栏 + 内容 + 页脚,纯黑底。
// 走廊有灯(Wavy),房间没有——背景只叠 grain 一层(§DESIGN 10.3)。
// 纵向节律取 mono 行盒的倍数:12 / 24 / 48 / 96(§DESIGN 2 间距节律)。

export function RoomShell({
  room,
  locale = "canonical",
  className,
  children,
}: {
  room: RoomId;
  locale?: Locale;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-black">
      <RoomHeader room={room} />
      <main className={cn("mx-auto w-full max-w-2xl grow px-6 pt-24", className)}>
        {children}
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
