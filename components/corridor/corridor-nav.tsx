"use client";

import Link from "next/link";
import type { Room, RoomId } from "@/lib/rooms";

// 五扇门(HOME-DESIGN §4.2):门牌只写名字——不加描述、不加图标、不加编号。
// hover/focus 上报给壳层做门缝读数(§4.3 ③);触屏无 hover,自然无此行为。

export function CorridorNav({
  rooms,
  onPeek,
}: {
  rooms: Room[];
  onPeek: (room: RoomId | null) => void;
}) {
  // 红线 3:一扇开着的门都没有时,连 <nav> 都不渲染
  if (rooms.length === 0) return null;

  return (
    <nav aria-label="rooms" className="mt-10">
      <ul className="flex items-baseline justify-center whitespace-nowrap font-mono text-sm">
        {rooms.map((room, index) => (
          <li key={room.id} className="flex items-baseline">
            {index > 0 && (
              <span aria-hidden="true" className="px-2 text-white/30">
                ·
              </span>
            )}
            <Link
              href={room.href}
              className="py-3 text-white/60 underline-offset-4 transition-colors duration-200 hover:text-white hover:underline focus-visible:text-white focus-visible:underline"
              onMouseEnter={() => onPeek(room.id)}
              onMouseLeave={() => onPeek(null)}
              onFocus={() => onPeek(room.id)}
              onBlur={() => onPeek(null)}
            >
              {room.id}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
