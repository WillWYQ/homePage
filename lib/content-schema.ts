// photoSet frontmatter 的 zod schema(spec §3.1 / DESIGN §4 约定 3)。
// 本仓库第一个 lib/content-schema.ts 文件与第一个 zod 依赖;now/about/lab 现有的
// ad hoc 手写校验本次不回头重构——DESIGN §4 说全量 schema 最终都要搬进这个文件,
// 但那是第 4 期随解析管线一起做的事,本次只加 photoSet 一个。

import { z } from "zod";

export const photoSetSchema = z.object({
  title: z.string().trim().min(1).optional(),
  date: z.coerce.date().optional(),
  photos: z
    .array(
      z.object({
        file: z
          .string()
          .trim()
          .min(1)
          .regex(/\.(jpe?g|png|webp|heic)$/i, "file 必须是图片文件名(jpg/jpeg/png/webp/heic)"),
        caption: z.string().optional(),
      }),
    )
    .optional(),
});

export type PhotoSetFrontmatter = z.infer<typeof photoSetSchema>;

// reel frontmatter 的 zod schema(spec §2/§3)。精选/日志各自可选——两者皆空是
// 合法的中间状态(page.tsx 据此决定 404,不是 schema 的职责,§1 完成标准)。
// 校验失败直接抛错(getReel() 里做,同 photoSetSchema 的处理):单作者站点,
// 提前发现拼写错误好过悄悄丢内容。

export const reelFavoriteSchema = z.object({
  title: z.string().trim().min(1),
  note: z.string().optional(),
  sleeve: z
    .string()
    .trim()
    .regex(
      /^\/reel\/.+\.(jpe?g|png|webp|svg)$/i,
      "sleeve 必须是 /reel/ 开头的图片路径(如 /reel/xxx.jpg)",
    )
    .optional(),
  href: z
    .string()
    .trim()
    .regex(/^https?:\/\//i, "href 必须是 http(s) 外链")
    .optional(),
});

export const reelLogEntrySchema = z.object({
  date: z.coerce.date(),
  text: z.string().trim().min(1),
  ref: z
    .string()
    .trim()
    .regex(/^\/(?!\/)/, "ref 必须是站内路径,以单个 / 开头(不能是 // 开头的协议相对地址)")
    .optional(),
});

export const reelSchema = z.object({
  favorites: z.array(reelFavoriteSchema).optional(),
  log: z.array(reelLogEntrySchema).optional(),
});

export type ReelFrontmatter = z.infer<typeof reelSchema>;
