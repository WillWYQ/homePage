// 房间注册表:走廊五扇门的唯一事实来源(HOME-DESIGN §4.2)。
// 红线 3:房间没内容就不上线入口——open 为 false 的门牌在走廊里不渲染(不是置灰)。
// 房间上线时把对应 open 翻为 true,走廊无需改任何其他代码。

export type RoomId = "now" | "lab" | "notes" | "photos" | "about";

export type Room = {
  id: RoomId;
  href: string;
  open: boolean;
};

export const ROOMS: readonly Room[] = [
  { id: "now", href: "/now", open: false },
  { id: "lab", href: "/lab", open: false },
  { id: "notes", href: "/notes", open: false },
  { id: "photos", href: "/photos", open: false },
  { id: "about", href: "/about", open: false },
];

export function openRooms(): Room[] {
  return ROOMS.filter((room) => room.open);
}
