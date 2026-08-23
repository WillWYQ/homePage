"use client";

// /photos 暗房:瀑布流索引 + 内嵌灯箱(spec §6.1/§6.2)。
// CSS 多栏瀑布流,不引入 masonry 库;灯箱手写,不引入轮播库——两处都延续
// DESIGN §5 已经定的调子("<img srcset> 优于自定义 loader",少一层抽象)。

import { useCallback, useEffect, useState } from "react";
import type { PhotoFrame, PhotoRoll } from "@/lib/content";

type LightboxState = { rollIndex: number; frameIndex: number } | null;

/** EXIF 行:`X100V · 23mm · f/2 · 1/250 · ISO 640 · 2026-06-30`(DESIGN §5)。
 * 字段缺失时优雅省略,不留悬空的 " · "(spec §6.2)。 */
function formatExifLine(frame: PhotoFrame): string | null {
  const parts: string[] = [];
  if (frame.exif?.camera) parts.push(frame.exif.camera);
  if (frame.exif?.focal) parts.push(`${frame.exif.focal}mm`);
  if (frame.exif?.aperture) parts.push(`f/${frame.exif.aperture}`);
  if (frame.exif?.shutter) parts.push(frame.exif.shutter);
  if (frame.exif?.iso) parts.push(`ISO ${frame.exif.iso}`);
  if (frame.takenAt) parts.push(frame.takenAt.slice(0, 10));
  return parts.length ? parts.join(" · ") : null;
}

function srcSetFor(frame: PhotoFrame): string | undefined {
  if (!frame.sizes) return undefined;
  return Object.entries(frame.sizes)
    .map(([w, url]) => `${url} ${w}w`)
    .join(", ");
}

function largestSrc(frame: PhotoFrame): string {
  if (!frame.sizes) return "";
  const widths = Object.keys(frame.sizes)
    .map(Number)
    .sort((a, b) => b - a);
  const key = String(widths[0]) as keyof NonNullable<PhotoFrame["sizes"]>;
  return frame.sizes[key] ?? "";
}

export function PhotoDarkroom({ rolls }: { rolls: PhotoRoll[] }) {
  const [lightbox, setLightbox] = useState<LightboxState>(null);

  const close = useCallback(() => setLightbox(null), []);

  const step = useCallback(
    (delta: number) => {
      setLightbox((current) => {
        if (!current) return current;
        const roll = rolls[current.rollIndex];
        const next = current.frameIndex + delta;
        if (next < 0 || next >= roll.frames.length) return current;
        return { ...current, frameIndex: next };
      });
    },
    [rolls],
  );

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, close, step]);

  const activeFrame = lightbox ? rolls[lightbox.rollIndex].frames[lightbox.frameIndex] : null;
  const exifLine = activeFrame ? formatExifLine(activeFrame) : null;

  return (
    <div className="space-y-16">
      {rolls.map((roll, rollIndex) => (
        <section key={roll.slug}>
          <h2 className="font-mono text-xs text-white/40">{roll.title}</h2>
          <div className="mt-4 columns-2 gap-2 md:columns-3">
            {roll.frames.map((frame, frameIndex) => (
              <button
                key={frame.file}
                type="button"
                onClick={() => setLightbox({ rollIndex, frameIndex })}
                className="mb-2 block w-full break-inside-avoid focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-500"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- 静态导出走 srcset,
                    不用 next/image custom loader(DESIGN §5 已否决该方案) */}
                <img
                  src={largestSrc(frame)}
                  srcSet={srcSetFor(frame)}
                  sizes="(min-width: 768px) 33vw, 50vw"
                  alt={frame.caption ?? ""}
                  loading="lazy"
                  width={frame.width ?? undefined}
                  height={frame.height ?? undefined}
                  style={
                    frame.blurDataUrl
                      ? { backgroundImage: `url(${frame.blurDataUrl})`, backgroundSize: "cover" }
                      : undefined
                  }
                  className="w-full"
                />
              </button>
            ))}
          </div>
        </section>
      ))}

      {lightbox && activeFrame && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-6"
        >
          <button
            type="button"
            onClick={close}
            aria-label="close"
            className="absolute right-6 top-6 font-mono text-xs text-white/60 transition-colors duration-200 hover:text-white"
          >
            Esc ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={largestSrc(activeFrame)}
            srcSet={srcSetFor(activeFrame)}
            alt={activeFrame.caption ?? ""}
            width={activeFrame.width ?? undefined}
            height={activeFrame.height ?? undefined}
            className="max-h-[80vh] max-w-full object-contain"
          />
          {exifLine && <p className="mt-4 font-mono text-xs text-white/40">{exifLine}</p>}
        </div>
      )}
    </div>
  );
}
