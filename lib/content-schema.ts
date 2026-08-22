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
