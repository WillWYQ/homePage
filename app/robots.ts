import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// 构建期静态产出(§DESIGN 8)。无统计脚本、无 cookie,也没什么要藏的。

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
