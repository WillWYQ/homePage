// 内容库读取层(§DESIGN 4)。
// 解析管线(content/ 扫描 + gray-matter + zod 校验)第 3 期落地;
// 在那之前这里诚实返回"无数据"——读数第②段与门缝读数随之整段省略(红线 3),
// 不在这里硬编码任何假数字(不许假)。
// 第 3 期接入时只改本文件的实现,类型与调用方不动。

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
  return null;
}

export function getRoomStatuses(): RoomStatuses {
  return { now: null, lab: null, notes: null, photos: null, about: null };
}
