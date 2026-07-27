import { Client } from "minio";
import { env } from "@/lib/env";
import type { Storage } from "./types";

const client = new Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: false,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

let ensureBucketPromise: Promise<void> | undefined;

function ensureBucket(): Promise<void> {
  if (!ensureBucketPromise) {
    ensureBucketPromise = (async () => {
      const exists = await client.bucketExists(env.MINIO_BUCKET);
      if (!exists) await client.makeBucket(env.MINIO_BUCKET);
    })();
  }
  return ensureBucketPromise;
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export const storage: Storage = {
  async put(key, content, contentType) {
    await ensureBucket();
    await client.putObject(env.MINIO_BUCKET, key, content, content.length, {
      "Content-Type": contentType,
    });
  },

  async get(key) {
    await ensureBucket();
    const [stream, stat] = await Promise.all([
      client.getObject(env.MINIO_BUCKET, key),
      client.statObject(env.MINIO_BUCKET, key),
    ]);
    const content = await streamToBuffer(stream);
    const contentType = stat.metaData["content-type"] ?? "application/octet-stream";
    return { content, contentType };
  },
};
