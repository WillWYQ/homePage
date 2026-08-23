import { createHash } from "node:crypto";

export function contentHash(buffer) {
  return createHash("sha256").update(buffer).digest("hex").slice(0, 10);
}
