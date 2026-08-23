import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoomShell } from "@/components/room-shell";
import { PhotoDarkroom } from "@/components/photos/photo-darkroom";
import { getPhotoRolls } from "@/lib/content";
import type { Locale } from "@/lib/i18n/strings";
import { isWillsleep } from "@/lib/site";

// /photos — 暗房(§DESIGN 5)。瀑布流索引 + 内嵌灯箱,图源全部走 R2(§DESIGN 6)。
// 房间名不外泄到 yueqiao 构建(红线 2 的身份切分):那边这条路由只是一个 404

export const metadata: Metadata = isWillsleep
  ? { title: "photos · The Sleep Lab", description: "暗房:按 roll 分组的照片" }
  : { title: "Not found · Yueqiao Dev" };

export default async function PhotosPage({
  locale = "canonical",
}: {
  locale?: Locale;
}) {
  // 双站门控(§DESIGN 8):yueqiao 构建不出新板块
  if (!isWillsleep) notFound();

  const rolls = await getPhotoRolls();
  if (rolls.length === 0) notFound();

  return (
    <RoomShell room="photos" locale={locale} className="max-w-5xl">
      <PhotoDarkroom rolls={rolls} />
    </RoomShell>
  );
}
