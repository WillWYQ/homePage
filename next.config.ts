import type { NextConfig } from "next";

// 走廊↔房间的轻微交叉淡入(§DESIGN 10.4 / HOME §5):View Transitions 在 App Router 下
// 已默认开启、零配置(Next 16.3+ 不再需要 experimental.viewTransition)。
// 客户端导航生效,静态导出无碍;不支持的浏览器自然回落为瞬时切换,不做 JS 模拟。
const nextConfig: NextConfig = {
  output: 'export',
  // 产物变目录 index.html,GitHub Pages 上最稳(§DESIGN 8)
  trailingSlash: true,
  allowedDevOrigins: ['192.168.68.128'],
};

export default nextConfig;
