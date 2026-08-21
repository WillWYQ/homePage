"use client";

// EXP-003 dream decay(§DESIGN 5 /lab,2026-08-21 spec §3,用户已确认两点:
// ① 复述触发方式维持自动——打开页面就算一次复述,不做手动"重读"按钮;
// ② 梦境文字维持 Geist Sans,不给 Lora 开第三处例外)。
//
// 反转 EncryptedText:清晰→乱码,不是乱码→清晰。写下一段梦,仅存本地
// localStorage(不上传、不联网,静态站物理上也做不到)。每次重新打开这个
// 实验页就是一次"复述",mount 时自动触发一次衰减——遗忘不是访客能叫停
// 的事,做成按钮会让"这件仪器研究的问题"不成立(spec §3 的论证)。
//
// 衰减两段式:intact → scrambled → gone。同一个词第一次被选中只变乱码,
// 第二次被选中才真的消失——所以第一次复述只会让文字变模糊,不会立刻丢
// 任何一个词,更接近真实遗忘的渐进感。

import { useEffect, useState } from "react";

const STORAGE_KEY = "sl.exp003.dream";
const DECAY_FRACTION = 0.15; // 每次复述约 15% 的原词(SPEC §3)
const FLOOR_FRACTION = 0.2; // 至少 20% 原词保持"可读"(intact 或 scrambled)
const SCRAMBLE_CHARS = "abcdefghijklmnopqrstuvwxyz···⋯⌇∷⁘";
// 中文语境下也用拉丁乱码字符(与走廊开场解密美学同源,§DESIGN 10.1),
// 不伪造"乱码汉字"——那会显得像编码错误而不是遗忘。

// CJK 字符逐字一个词;非 CJK 按空白切分,标点随前一个词。
// 中文没有空格分词,这是唯一不依赖分词库/网络的诚实做法(不许假)。
const CJK_RE = /[一-鿿぀-ヿ가-힯]/;

type WordState = "intact" | "scrambled" | "gone";
type Token = { text: string; isWord: boolean };
type DecayWord = Token & { state: WordState };

type StoredRecord = {
  words: DecayWord[]; // 当前快照,有损、不存原文(SPEC §3:衰减是有损单向的)
  decayCount: number;
  anchorIndex: number; // 首句锚点词,永不进入衰减候选
};

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let buf = "";
  const flush = () => {
    if (buf) tokens.push({ text: buf, isWord: true });
    buf = "";
  };
  for (const ch of text) {
    if (/\s/.test(ch)) {
      flush();
      tokens.push({ text: ch, isWord: false });
    } else if (CJK_RE.test(ch)) {
      flush();
      tokens.push({ text: ch, isWord: true });
    } else {
      buf += ch;
    }
  }
  flush();
  return tokens;
}

function firstWordIndex(tokens: Token[]): number {
  const i = tokens.findIndex((t) => t.isWord);
  return i === -1 ? 0 : i;
}

/** 纯函数:一次复述的衰减。seed 可注入,便于日后写确定性测试。 */
function decayOnce(
  words: DecayWord[],
  anchorIndex: number,
  seed: () => number = Math.random,
): DecayWord[] {
  const total = words.filter((w) => w.isWord).length;
  const goneNow = words.filter((w) => w.isWord && w.state === "gone").length;
  const floor = Math.ceil(total * FLOOR_FRACTION);
  const maxNewGone = Math.max(0, total - floor - goneNow);
  const quota = Math.min(Math.round(total * DECAY_FRACTION), total);
  if (quota <= 0) return words;

  const candidates = words
    .map((w, i) => ({ i, state: w.state, isWord: w.isWord }))
    .filter((c) => c.isWord && c.i !== anchorIndex && c.state !== "gone");

  // Fisher–Yates,注入的 seed 便于将来写确定性测试。
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seed() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  let goneUsed = 0;
  const next = words.map((w) => ({ ...w }));
  for (const c of shuffled.slice(0, quota)) {
    if (next[c.i].state === "intact") {
      next[c.i].state = "scrambled";
    } else if (next[c.i].state === "scrambled" && goneUsed < maxNewGone) {
      next[c.i].state = "gone";
      goneUsed++;
    }
    // 已到下限:该词维持 scrambled,不越线(衰减有下限,SPEC §3)。
  }
  return next;
}

function scrambleFor(text: string): string {
  return Array.from(text)
    .map(() => SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)])
    .join("");
}

function loadRecord(): StoredRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredRecord;
    return Array.isArray(parsed.words) ? parsed : null;
  } catch {
    return null;
  }
}

function saveRecord(record: StoredRecord): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // 存储不可用(隐私模式等)——诚实降级:这次不记住,不报错打断体验。
  }
}

/** 单个词的渲染:justChanged 时先抖动几帧乱码,再定格到目标态(SPEC §3:变化要能被看见)。 */
function DecayWordSpan({
  word,
  justChanged,
}: {
  word: DecayWord;
  justChanged: boolean;
}) {
  const [display, setDisplay] = useState(
    justChanged ? word.text : word.state === "gone" ? "" : word.text,
  );

  useEffect(() => {
    if (!justChanged) return;
    let frame = 0;
    const maxFrames = 8;
    const id = window.setInterval(() => {
      frame++;
      if (frame >= maxFrames) {
        window.clearInterval(id);
        setDisplay(word.state === "gone" ? "" : scrambleFor(word.text));
        return;
      }
      setDisplay(scrambleFor(word.text));
    }, 70);
    return () => window.clearInterval(id);
    // 只在挂载时抖动一轮,故意空依赖数组(同 breathing-field 的既有先例)。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (word.state === "gone" && display === "") return null;
  return (
    <span className={word.state === "intact" ? "text-white" : "text-white/35"}>
      {display}
    </span>
  );
}

export default function DreamDecay() {
  const [phase, setPhase] = useState<"loading" | "empty" | "written">("loading");
  const [record, setRecord] = useState<StoredRecord | null>(null);
  const [changedIndices, setChangedIndices] = useState<Set<number>>(new Set());
  const [draft, setDraft] = useState("");

  // 挂载 = 一次复述(如果已有记录)。ssr:false 下这是首次真正执行的地方,
  // 避免"先闪一下写作提示、再闪成已有的梦"这种状态跳变(ssr:false 组件
  // 本就不参与服务端渲染,这里纯粹是体验上的先后顺序问题)。
  useEffect(() => {
    const existing = loadRecord();
    if (!existing) {
      setPhase("empty");
      return;
    }
    const decayed = decayOnce(existing.words, existing.anchorIndex);
    const changed = new Set<number>();
    decayed.forEach((w, i) => {
      if (w.state !== existing.words[i].state) changed.add(i);
    });
    const next: StoredRecord = {
      ...existing,
      words: decayed,
      decayCount: existing.decayCount + 1,
    };
    saveRecord(next);
    setRecord(next);
    setChangedIndices(changed);
    setPhase("written");
  }, []);

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const tokens = tokenize(trimmed);
    const words: DecayWord[] = tokens.map((t) => ({ ...t, state: "intact" }));
    const next: StoredRecord = {
      words,
      decayCount: 0,
      anchorIndex: firstWordIndex(tokens),
    };
    saveRecord(next);
    setRecord(next);
    setChangedIndices(new Set());
    setPhase("written");
  };

  if (phase === "loading") return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black p-8">
      {phase === "empty" && (
        <div className="w-full max-w-xl">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="write down a dream…"
            rows={5}
            className="w-full resize-none border border-white/10 bg-white/[0.02] p-4 font-sans text-white placeholder:text-white/30 focus-visible:border-green-500/40 focus-visible:outline-none"
          />
          <p className="mt-3 font-mono text-xs text-white/40">
            stored only in this browser · never uploaded · will not stay exact
          </p>
          <button
            type="button"
            onClick={submit}
            className="mt-4 font-mono text-xs text-white/60 underline-offset-4 transition-colors duration-200 hover:text-white focus-visible:text-white"
          >
            let it go →
          </button>
        </div>
      )}

      {phase === "written" && record && (
        <div className="w-full max-w-xl">
          <p className="font-sans text-lg leading-relaxed">
            {record.words.map((w, i) =>
              w.isWord ? (
                <DecayWordSpan key={i} word={w} justChanged={changedIndices.has(i)} />
              ) : (
                <span key={i}>{w.text}</span>
              ),
            )}
          </p>
          <p className="mt-6 font-mono text-xs text-white/40">
            reread {record.decayCount} time{record.decayCount === 1 ? "" : "s"}
          </p>
        </div>
      )}
    </div>
  );
}
