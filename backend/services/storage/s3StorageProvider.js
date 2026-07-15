import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { logS3 } from "../../logger/index.js"
import { recordDomainEvent } from "../monitoring/metricsStore.js"

function getConfig() {
  return {
    bucket: process.env.AWS_S3_BUCKET,
    region: process.env.AWS_REGION || "us-east-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    prefix: String(process.env.AWS_S3_PREFIX || "travel-documents").replace(/^\/+|\/+$/g, ""),
  }
}

export function isS3Configured() {
  const { bucket, accessKeyId, secretAccessKey } = getConfig()
  return Boolean(bucket && accessKeyId && secretAccessKey)
}

function getClient() {
  const { region, accessKeyId, secretAccessKey } = getConfig()
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("AWS S3 credentials are not configured")
  }
  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  })
}

/** Exposed for health checks only — never log credentials. */
export function getS3ClientForHealth() {
  return getClient()
}

export function buildS3Key(key) {
  const { prefix } = getConfig()
  return prefix ? `${prefix}/${key}` : key
}

async function streamToBuffer(body) {
  if (!body) return Buffer.alloc(0)
  if (Buffer.isBuffer(body)) return body
  if (body instanceof Uint8Array) return Buffer.from(body)
  const chunks = []
  for await (const chunk of body) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export async function uploadS3({ buffer, key, contentType }) {
  const { bucket } = getConfig()
  if (!bucket) throw new Error("AWS_S3_BUCKET is not configured")

  const s3Key = buildS3Key(key)
  try {
    const client = getClient()
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType,
        ServerSideEncryption: "AES256",
      }),
    )
    logS3.info("S3 upload ok", { key: s3Key, contentType, bytes: buffer?.length })
    recordDomainEvent("s3", true)
  } catch (err) {
    logS3.error("S3 upload failed", { key: s3Key, message: err.message })
    recordDomainEvent("s3", false, err.message)
    throw err
  }

  return {
    storageKey: s3Key,
    fileUrl: "",
    contentType,
  }
}

export async function downloadS3(key) {
  const { bucket } = getConfig()
  if (!bucket) throw new Error("AWS_S3_BUCKET is not configured")

  const client = getClient()
  const res = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  )
  return streamToBuffer(res.Body)
}

export async function getS3SignedUrl(key, expiresIn = 900) {
  const { bucket } = getConfig()
  if (!bucket || !key) return null

  try {
    const client = getClient()
    return getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn },
    )
  } catch {
    return null
  }
}

export async function deleteS3(key) {
  const { bucket } = getConfig()
  if (!bucket || !key) return

  try {
    const client = getClient()
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
  } catch {
    /* ignore */
  }
}
