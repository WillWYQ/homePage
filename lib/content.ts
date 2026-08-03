// 内容库读取层(§DESIGN 4)。
//
// 第 1 期只做"最小读取":读 content/ 下固定路径的 index.md + gray-matter 取 frontmatter。
// 通用解析管线、zod 校验、new:* 脚手架仍在第 3 期——那时只改本文件的实现,
// 类型与调用方不动。/now 与 /about 的内容全住 frontmatter(ABOUT §5 正文区留白),
// 所以这一期不需要 remark。
//
// 不许假:读不到就返回 null,不硬编码任何占位数字——读数第②段与门缝读数
// 随之整段省略(红线 3)。

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content");

/** 读一个内容单元的 index.md;不存在返回 null(该房间就此没有可报数据)。 */
function readUnit(
  ...segments: string[]
): { data: Record<string, unknown>; body: string } | null {
  const file = path.join(CONTENT_DIR, ...segments, "index.md");
  let raw: string;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
  const parsed = matter(raw);
  return {
    data: parsed.data as Record<string, unknown>,
    body: parsed.content.trim(),
  };
}

/** frontmatter 的日期可能被 YAML 解析成 Date,统一收敛为 ISO 字符串。 */
function toISODate(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

function toStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

/** 正文区的极简处理:按空行切段落,原样输出。markdown 语法编译留到第 3 期。 */
function toParagraphs(body: string): string[] {
  return body
    ? body
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];
}

// ——————————————————————————— /now 值班表 ———————————————————————————

export type NowSectionId = "tinkering" | "reading" | "thinking" | "listening";

/** 值班表(§DESIGN 5 /now):四个小节,内容为混排短句列表。 */
export type NowContent = {
  updated: string | null;
  sections: { id: NowSectionId; items: string[] }[];
  paragraphs: string[];
};

const NOW_SECTIONS: readonly NowSectionId[] = [
  "tinkering",
  "reading",
  "thinking",
  "listening",
];

export function getNow(): NowContent | null {
  const unit = readUnit("now");
  if (!unit) return null;

  return {
    updated: toISODate(unit.data.updated),
    sections: NOW_SECTIONS.map((id) => ({
      id,
      items: toStringList(unit.data[id]),
    })).filter((section) => section.items.length > 0), // 空小节不渲染(红线 3)
    paragraphs: toParagraphs(unit.body),
  };
}

// ——————————————————————— /about 驻留研究员 ———————————————————————

export type Observer = {
  id: number;
  date: string | null;
  /** 证据等级:观察 | 推断 | 猜测(ABOUT §3.1),mono 渲染 */
  grade: string;
  quote: string;
  /** 本人批注,可省(ABOUT §3.2 的幽默出口) */
  note?: string;
};

export type NamingGuess = { quote: string; grade: string };

export type ShelfItem = { title: string; note?: string; href?: string };

export type AboutContent = {
  title: string;
  /** ① 展牌,≤60 字,第三人称 */
  placard: string;
  /** ③ 开头引言(ABOUT 附录 B:"每位观察者只见过他的一个房间") */
  epigraph: string | null;
  observers: Observer[];
  /** 策展人注记,放在观察条目之后,mono 小字 */
  curatorNote: string | null;
  /** ④ 命名注释 */
  naming: NamingGuess[];
  namingNote: string | null;
  /** ② 自画像:静态 ASCII 印版(签名额度已给手电筒,§DESIGN 10.1) */
  portrait: string | null;
  portraitAlt: string | null;
  /** ⑤ 收藏架四层 */
  shelves: { id: string; items: ShelfItem[] }[];
  paragraphs: string[];
};

const SHELF_IDS = ["books", "films", "music", "gear"] as const;

function toObservers(value: unknown): Observer[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const o = raw as Record<string, unknown>;
    if (typeof o.quote !== "string") return [];
    return [
      {
        id: typeof o.id === "number" ? o.id : 0,
        date: toISODate(o.date),
        grade: typeof o.grade === "string" ? o.grade : "",
        quote: o.quote,
        note: typeof o.note === "string" ? o.note : undefined,
      },
    ];
  });
}

function toShelfItems(value: unknown): ShelfItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const o = raw as Record<string, unknown>;
    if (typeof o.title !== "string") return [];
    return [
      {
        title: o.title,
        note: typeof o.note === "string" ? o.note : undefined,
        href: typeof o.href === "string" ? o.href : undefined,
      },
    ];
  });
}

export function getAbout(): AboutContent | null {
  const unit = readUnit("about");
  if (!unit) return null;
  const d = unit.data;

  const naming: NamingGuess[] = Array.isArray(d.naming)
    ? d.naming.flatMap((raw) => {
        if (!raw || typeof raw !== "object") return [];
        const o = raw as Record<string, unknown>;
        if (typeof o.quote !== "string") return [];
        return [
          { quote: o.quote, grade: typeof o.grade === "string" ? o.grade : "" },
        ];
      })
    : [];

  const shelvesRaw = (d.shelves ?? {}) as Record<string, unknown>;

  return {
    title: typeof d.title === "string" ? d.title : "the resident researcher",
    placard: typeof d.placard === "string" ? d.placard.trim() : "",
    epigraph: typeof d.epigraph === "string" ? d.epigraph : null,
    observers: toObservers(d.observers),
    curatorNote: typeof d.curator_note === "string" ? d.curator_note : null,
    naming,
    namingNote: typeof d.naming_note === "string" ? d.naming_note : null,
    portrait:
      typeof d.portrait === "string" ? d.portrait.replace(/\s+$/, "") : null,
    portraitAlt: typeof d.portrait_alt === "string" ? d.portrait_alt : null,
    shelves: SHELF_IDS.map((id) => ({
      id,
      items: toShelfItems(shelvesRaw[id]),
    })).filter((shelf) => shelf.items.length > 0),
    paragraphs: toParagraphs(unit.body),
  };
}

// ——————————————— /lab 实验区 ———————————————
// 元数据与记录面板文字全住 content/lab/<slug>/index.md(§DESIGN 5)。
// 读不到/字段缺 title 或 question 的单元直接忽略——宁缺毋滥(红线 3)。

export type LabStatus = "ongoing" | "archived";

export type LabExperiment = {
  slug: string;
  exp: string;
  title: string;
  question: string;
  status: LabStatus;
  method: string;
  observation: string;
  instruments: string[];
  poster: string | null;
};

function toLabExperiment(slug: string, data: Record<string, unknown>): LabExperiment | null {
  if (typeof data.title !== "string" || typeof data.question !== "string") return null;
  return {
    slug,
    exp: typeof data.exp === "string" ? data.exp : "",
    title: data.title,
    question: data.question,
    status: data.status === "archived" ? "archived" : "ongoing",
    method: typeof data.method === "string" ? data.method : "",
    observation: typeof data.observation === "string" ? data.observation : "",
    instruments: toStringList(data.instruments),
    poster: typeof data.poster === "string" ? data.poster : null,
  };
}

export function getLabExperiments(): LabExperiment[] {
  const dir = path.join(CONTENT_DIR, "lab");
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return [];
  }
  const list: LabExperiment[] = [];
  for (const name of entries.sort()) {
    const unit = readUnit("lab", name);
    if (!unit) continue;
    const exp = toLabExperiment(name, unit.data);
    if (exp) list.push(exp);
  }
  return list;
}

export function getLabExperiment(slug: string): LabExperiment | null {
  const unit = readUnit("lab", slug);
  if (!unit) return null;
  return toLabExperiment(slug, unit.data);
}

// ————————————— 走廊的构建期取数(HOME-DESIGN §4.3 / §7) —————————————

/** 最新一条记录(note / REM / IR / roll),构建期注入;相对时间由客户端按 nights 换算。 */
export type LatestEntry = {
  /** 展示编号,如 "REM-007" 或日期式 slug 标题 */
  id: string;
  /** ISO 日期(取本地午夜换算 nights) */
  date: string;
};

/** 各房间门缝读数的原始数据(HOME-DESIGN §4.3 ③)。null = 该房间暂无可报数据。 */
export type RoomStatuses = {
  now: { updatedAt: string } | null;
  lab: { experiments: number; ongoing: number } | null;
  notes: { records: number; latestId: string } | null;
  photos: { rolls: number; frames: number } | null;
  about: { resident: true } | null;
};

export function getLatestEntry(): LatestEntry | null {
  // notes / photos 上线前(第 3、4 期)没有"最新记录"可报,读数第②段整段省略。
  return null;
}

export function getRoomStatuses(): RoomStatuses {
  const now = getNow();
  const about = getAbout();
  return {
    now: now?.updated ? { updatedAt: now.updated } : null,
    lab: (() => {
      const exps = getLabExperiments();
      return exps.length
        ? { experiments: exps.length, ongoing: exps.filter((e) => e.status === "ongoing").length }
        : null;
    })(),
    notes: null,
    photos: null,
    about: about ? { resident: true } : null,
  };
}
