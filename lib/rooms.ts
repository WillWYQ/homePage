// 房间注册表:走廊五扇门的唯一事实来源(HOME-DESIGN §4.2)。
// 红线 3:房间没内容就不上线入口——open 为 false 的门牌在走廊里不渲染(不是置灰)。
// 房间上线时把对应 open 翻为 true,走廊无需改任何其他代码。

export type RoomId = "now" | "lab" | "notes" | "photos" | "about" | "reel";

export type Room = {
  id: RoomId;
  href: string;
  open: boolean;
};

export const ROOMS: readonly Room[] = [
  { id: "now", href: "/now", open: true }, // 第 1 期
  { id: "lab", href: "/lab", open: true }, // 第 2 期
  { id: "notes", href: "/notes", open: false }, // 第 3 期
  { id: "photos", href: "/photos", open: false }, // 第 4 期
  { id: "about", href: "/about", open: true }, // 第 1 期
  { id: "reel", href: "/reel", open: false }, // 待定期(用户确认:追加式存档,排最后)
];

export function openRooms(): Room[] {
  return ROOMS.filter((room) => room.open);
}
