import sharp from "sharp";

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
