"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { openRooms, type RoomId } from "@/lib/rooms";
import { t, type Locale } from "@/lib/i18n/strings";

// 404 — 标本架(§DESIGN 5)。三层结构:互动 → 幽默 → 实用,导航长在剧情里。
//
// 实用层:有标本的罐子就是站点地图——但只摆已上线的房间(红线 3:
// 没上线的房间不因为在 404 页就获得门牌)。架子会随分期上线一只只变满。
// 互动层:正中的空罐 hover 轻晃,点击飘出 `last seen: in a dream`。
// 幽默层:空罐标签印访客敲错的路径,盖章 SPECIMEN MISSING(印章同为终端绿,
// 不为一枚章破单一强调色)。
//
// 全 CSS/SVG,不用 canvas;无 JS 时罐子退化为普通链接、标签印 unknown specimen;
// reduced-motion 全静态。不加音效(SOUND-DESIGN 法则 1)。

const GREEN = "#22c55e";

/** 罐内标本:形态对应房间气质。纯静态图形,不动——动的只有访客。 */
function Specimen({ room }: { room: RoomId }) {
  switch (room) {
    case "now": // 波形
      return (
        <path
          d="M14 46 q5 -10 10 0 t10 0 t10 0"
          fill="none"
          stroke={GREEN}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      );
    case "lab": // 粒子
      return (
        <g fill={GREEN}>
          {[
            [20, 38],
            [30, 46],
            [40, 40],
            [25, 52],
            [36, 56],
            [30, 32],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={i % 2 ? 1.2 : 1.8} />
          ))}
        </g>
      );
    case "notes": // 字符
      return (
        <text
          x="30"
          y="50"
          textAnchor="middle"
          fill={GREEN}
          fontSize="11"
          fontFamily="var(--font-geist-mono), monospace"
        >
          ¶§
        </text>
      );
    case "photos": // 底片
      return (
        <g stroke={GREEN} strokeWidth="1.2" fill="none">
          <rect x="18" y="36" width="24" height="18" rx="1" />
          {[21, 27, 33, 39].map((x) => (
            <line key={x} x1={x} y1="38" x2={x} y2="39.5" strokeWidth="1.5" />
          ))}
          {[21, 27, 33, 39].map((x) => (
            <line key={x} x1={x} y1="50.5" x2={x} y2="52" strokeWidth="1.5" />
          ))}
        </g>
      );
    case "about": // 剪影
      return (
        <g fill={GREEN}>
          <circle cx="30" cy="42" r="4.5" />
          <path d="M22 56 q8 -8 16 0 z" />
        </g>
      );
  }
}

function Jar({
  children,
  empty = false,
}: {
  children?: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 60 80"
      className={
        empty
          ? "h-28 w-20 origin-bottom transition-transform duration-200 group-hover:rotate-[1.5deg] motion-reduce:transition-none motion-reduce:group-hover:rotate-0"
          : "h-28 w-20"
      }
      aria-hidden="true"
    >
      {/* 罐体:细线玻璃 */}
      <g stroke="rgba(255,255,255,0.22)" strokeWidth="1" fill="none">
        <rect x="17" y="4" width="26" height="6" rx="2" />
        <rect x="21" y="10" width="18" height="5" />
        <rect x="8" y="15" width="44" height="60" rx="7" />
      </g>
      {/* 荧光:标本自己的光晕,静态 */}
      {children && (
        <g style={{ filter: `drop-shadow(0 0 6px ${GREEN}90)` }}>{children}</g>
      )}
    </svg>
  );
}

export function SpecimenShelf({ locale = "canonical" }: { locale?: Locale }) {
  // 幽默层:访客敲错的路径。GitHub Pages 把同一份 404.html 喂给任意 URL,
  // 所以真实路径只有浏览器知道——用 window.location 而非路由器的 pathname
  // (后者在导出的 404 里是 /_not-found,会印错)。SSR 快照为 null → unknown specimen。
  const path = useSyncExternalStore(
    () => () => {}, // 一次性读取,无需订阅:这个值在一次访问里不会变
    () => window.location.pathname,
    () => null,
  );
  const [lastSeen, setLastSeen] = useState(false);

  const rooms = openRooms();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-black px-6 py-24">
      <ul className="flex flex-wrap items-end justify-center gap-x-8 gap-y-12">
        {rooms.map((room) => (
          <li key={room.id}>
            <Link
              href={room.href}
              className="group flex flex-col items-center rounded-sm outline-offset-4"
            >
              <Jar>
                <Specimen room={room.id} />
              </Jar>
              <span className="mt-3 font-mono text-xs text-white/40 transition-colors duration-200 group-hover:text-white group-focus-visible:text-white">
                {room.id}
              </span>
            </Link>
          </li>
        ))}

        {/* 互动层:第六只罐子是空的 */}
        <li>
          <button
            type="button"
            onClick={() => setLastSeen(true)}
            className="group flex flex-col items-center rounded-sm outline-offset-4"
          >
            <Jar empty />
            <span className="mt-3 max-w-24 truncate font-mono text-xs text-white/40">
              {path && path !== "/" ? path : t("notFound.unknown", locale)}
            </span>
          </button>
        </li>
      </ul>

      {/* 幽默层:盖章。印章同为终端绿——不为一枚章破单一强调色(§DESIGN 2) */}
      <p className="mt-16 font-mono text-xs tracking-[0.2em] text-green-500">
        {t("notFound.stamp", locale)}
      </p>

      {/* 点击空罐后飘出的一行;不自动出现 */}
      <p
        className={`mt-3 font-mono text-xs text-white/40 transition-opacity duration-500 motion-reduce:transition-none ${
          lastSeen ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden={!lastSeen}
      >
        {t("notFound.lastSeen", locale)}
      </p>

      <Link
        href="/"
        className="mt-16 font-mono text-xs text-white/60 underline-offset-4 transition-colors duration-200 hover:text-white hover:underline focus-visible:text-white focus-visible:underline"
      >
        {t("notFound.back", locale)}
      </Link>
    </div>
  );
}
