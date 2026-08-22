import sharp from "sharp";
import { encode, decode } from "blurhash";

export const SIZE_LADDER = [480, 960, 1600, 2400];

/** 不放大(spec §4.3):原图窄于某档就跳过该档,不做插值放大出虚假清晰度。 */
export async function resizeTiers(buffer, widths = SIZE_LADDER) {
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width;
  const height = metadata.height;

  const tiers = [];
  for (const targetWidth of widths) {
    if (targetWidth > width) continue;
    const resized = await sharp(buffer)
      .resize({ width: targetWidth })
      .webp({ quality: 82 })
      .toBuffer();
    tiers.push({ width: targetWidth, buffer: resized });
  }
  return { width, height, tiers };
}

/**
 * blurhash 字符串 + 预渲染的 PNG data URL(spec §4.4)。只在 sync 脚本里算一次,
 * lib/content.ts 读取时直接透传 blurDataUrl,不在页面渲染路径上重新解码。
 */
export async function buildBlur(buffer) {
  try {
    const { data, info } = await sharp(buffer)
      .resize({ width: 32, height: 32, fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const hash = encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4);
    const pixels = decode(hash, info.width, info.height);
    const png = await sharp(Buffer.from(pixels), {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .png()
      .toBuffer();

    return {
      blurhash: hash,
      blurDataUrl: `data:image/png;base64,${png.toString("base64")}`,
    };
  } catch {
    return { blurhash: null, blurDataUrl: null };
  }
}
