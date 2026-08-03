import type { MetadataRoute } from "next";
import { getLabExperiments } from "@/lib/content";
import { openRooms } from "@/lib/rooms";
import { isWillsleep, SITE_URL } from "@/lib/site";

// 构建期静态产出(§DESIGN 8)。只收录**已上线**的房间——
// 红线 3 在 sitemap 上的形态:没上线的房间不该被爬虫发现。
// yueqiao 构建只收首页(不出新板块)。

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const home = { url: `${SITE_URL}/`, lastModified: new Date() };
  if (!isWillsleep) return [home];

  return [
    home,
    ...openRooms().map((room) => ({
      url: `${SITE_URL}${room.href}/`,
      lastModified: new Date(),
    })),
    // /lab 详情:逐实验收录(§DESIGN 7.5——真实存在的路由才进 sitemap)。
    ...getLabExperiments().map((e) => ({
      url: `${SITE_URL}/lab/${e.slug}/`,
      lastModified: new Date(),
    })),
  ];
}
