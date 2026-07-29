import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // 产物变目录 index.html,GitHub Pages 上最稳(§DESIGN 8)
  trailingSlash: true,
  allowedDevOrigins: ['192.168.68.128'],
  experimental: {
    // 走廊↔房间的轻微交叉淡入(§DESIGN 10.4 / HOME §5)。
    // 客户端导航生效,静态导出无碍;不支持的浏览器自然回落为瞬时切换,不做 JS 模拟。
    viewTransition: true,
  },
};

export default nextConfig;
