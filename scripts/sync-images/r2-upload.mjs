// scripts/sync-images/r2-upload.mjs
import { HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const REQUIRED_ENV_VARS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_BASE_URL",
];

export function checkCredentials(env = process.env) {
  const missing = REQUIRED_ENV_VARS.filter((key) => !env[key]);
  return { ok: missing.length === 0, missing };
}

/** HeadObject 先问 R2 权威状态是否已存在,存在即跳过——幂等的实际实现方式,
 * 不是"本地记录一份哈希清单"(spec §4.6)。 */
export async function uploadTier(client, { bucket, key, body, contentType }) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return { uploaded: false };
  } catch (err) {
    if (err?.name !== "NotFound" && err?.$metadata?.httpStatusCode !== 404) throw err;
  }
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return { uploaded: true };
}
