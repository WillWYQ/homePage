// UI 字典(§DESIGN 7.4):类型化 key,三列取值。
// canonical 列 = 英文 chrome(装饰性文案保持英文),zh 全中文,en 全英文。不引 i18n 框架。
// 铁律:编号(REM-007)、数字与单位 nights 在三版中保持一致——它们是仪器读数,不是文案。

import type { LatestEntry, RoomStatuses } from "@/lib/content";
import type { RoomId } from "@/lib/rooms";

export type Locale = "canonical" | "zh" | "en";

type Entry = Record<Locale, string>;

const STRINGS = {
  // 仪表读数:分时段文案(HOME-DESIGN §4.3 ①)
  "readout.band.night": {
    canonical: "the lights are on",
    zh: "灯还亮着",
    en: "the lights are on",
  },
  "readout.band.deep": {
    canonical: "you're in the right place",
    zh: "你来对地方了",
    en: "you're in the right place",
  },
  "readout.band.dawn": {
    canonical: "night shift ending",
    zh: "夜班快结束了",
    en: "night shift ending",
  },
  "readout.band.day": {
    canonical: "the lab sleeps during the day",
    zh: "实验室白天睡觉",
    en: "the lab sleeps during the day",
  },
  "readout.band.evening": {
    canonical: "warming up the instruments",
    zh: "仪器预热中",
    en: "warming up the instruments",
  },
  // 04:04,每晚一分钟(HOME-DESIGN §4.3 ④):清醒梦 reality check,梦里的钟不会走
  "readout.0404": {
    canonical: "04:04 · if this clock moves, you're awake",
    zh: "04:04 · 钟还在走,说明你醒着",
    en: "04:04 · if this clock moves, you're awake",
  },
  // 开场跳过提示(HOME-DESIGN §3.2)
  "intro.skipHint": {
    canonical: "tap to enter ↵",
    zh: "点击进入 ↵",
    en: "tap to enter ↵",
  },
  // 页脚 career 暗门(文案 2026-07-02 定稿,不动)
  "footer.career": {
    canonical: "Looking for my engineering work?",
    zh: "找我的工程侧作品?",
    en: "Looking for my engineering work?",
  },
} satisfies Record<string, Entry>;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey, locale: Locale = "canonical"): string {
  return STRINGS[key][locale];
}

/** 本地午夜为界的"夜数"——这栋楼按夜计时,不按天(HOME-DESIGN §4.3 ②)。 */
export function nightsBetween(dateISO: string, now: Date): number {
  const then = new Date(dateISO);
  if (Number.isNaN(then.getTime())) return 0;
  const midnight = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.max(0, Math.round((midnight(now) - midnight(then)) / 86_400_000));
}

const NIGHT_WORDS = [
  "",
  "",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
] as const;

export function formatNightsAgo(nights: number, locale: Locale = "canonical"): string {
  if (locale === "zh") {
    if (nights <= 0) return "今晚";
    if (nights === 1) return "昨夜";
    return `${nights} 夜前`;
  }
  if (nights <= 0) return "tonight";
  if (nights === 1) return "last night";
  const word = NIGHT_WORDS[nights] || String(nights);
  return `${word} nights ago`;
}

/** 读数第②段:`last entry: REM-007, two nights ago`(无内容时调用方整段省略)。 */
export function formatLastEntry(
  entry: LatestEntry,
  now: Date,
  locale: Locale = "canonical",
): string {
  const ago = formatNightsAgo(nightsBetween(entry.date, now), locale);
  if (locale === "zh") return `最新记录: ${entry.id},${ago}`;
  return `last entry: ${entry.id}, ${ago}`;
}

/**
 * 门缝读数(HOME-DESIGN §4.3 ③):hover/focus 门牌时读数行显示的单行状态。
 * 数字与编号来自构建期真值;该房间无数据时返回 null——悬停不换行,时钟继续走。
 */
export function formatPeek(
  room: RoomId,
  statuses: RoomStatuses,
  now: Date,
  locale: Locale = "canonical",
): string | null {
  const zh = locale === "zh";
  switch (room) {
    case "now": {
      const s = statuses.now;
      if (!s) return null;
      const ago = formatNightsAgo(nightsBetween(s.updatedAt, now), locale);
      return zh ? `now: ${ago}更新` : `now: last updated ${ago}`;
    }
    case "lab": {
      const s = statuses.lab;
      if (!s) return null;
      if (zh) return `lab: ${s.experiments} 件实验 · ${s.ongoing} 件进行中`;
      const unit = s.experiments === 1 ? "experiment" : "experiments";
      return `lab: ${s.experiments} ${unit} · ${s.ongoing} ongoing`;
    }
    case "notes": {
      const s = statuses.notes;
      if (!s) return null;
      if (zh) return `notes: ${s.records} 条记录 · 最新 ${s.latestId}`;
      const unit = s.records === 1 ? "record" : "records";
      return `notes: ${s.records} ${unit} · latest ${s.latestId}`;
    }
    case "photos": {
      const s = statuses.photos;
      if (!s) return null;
      if (zh) return `photos: ${s.rolls} 卷 · ${s.frames} 张`;
      const rolls = s.rolls === 1 ? "roll" : "rolls";
      const frames = s.frames === 1 ? "frame" : "frames";
      return `photos: ${s.rolls} ${rolls} · ${s.frames} ${frames}`;
    }
    case "about": {
      const s = statuses.about;
      if (!s) return null;
      return zh ? "about: 常驻研究员一名 · 夜行性" : "about: one resident · nocturnal";
    }
  }
}
