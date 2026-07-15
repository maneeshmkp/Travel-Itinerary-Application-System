import path from "path"
import sharp from "sharp"
import * as local from "./localStorageProvider.js"
import * as cloudinary from "./cloudinaryStorageProvider.js"
import * as s3 from "./s3StorageProvider.js"
import * as azure from "./azureStorageProvider.js"

export function getStorageProvider() {
  return (process.env.STORAGE_PROVIDER || "local").toLowerCase()
}

function buildKey(userId, docId, fileName) {
  const safe = String(fileName || "file").replace(/[^a-zA-Z0-9._-]/g, "_")
  return path.posix.join(String(userId), String(docId), safe)
}

export async function storeDocumentFile({ userId, docId, buffer, mimeType, originalName }) {
  const provider = getStorageProvider()
  const key = buildKey(userId, docId, originalName)

  let result
  switch (provider) {
    case "cloudinary":
      result = await cloudinary.uploadCloudinary({ buffer, key, contentType: mimeType })
      break
    case "s3":
      result = await s3.uploadS3({ buffer, key, contentType: mimeType })
      break
    case "azure":
      result = await azure.uploadAzure({ buffer, key, contentType: mimeType })
      break
    default:
      result = await local.uploadLocal({ buffer, key, contentType: mimeType })
  }

  return { ...result, storageProvider: provider, thumbnailKey: "", thumbnailUrl: "" }
}

export async function storeThumbnail({ userId, docId, buffer, mimeType }) {
  if (!mimeType?.startsWith("image/")) return null
  try {
    const thumbBuffer = await sharp(buffer)
      .resize(320, 320, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer()
    const key = buildKey(userId, docId, "thumb.jpg")
    const provider = getStorageProvider()
    if (provider === "local") {
      const r = await local.uploadLocal({ buffer: thumbBuffer, key, contentType: "image/jpeg" })
      return { thumbnailKey: r.storageKey, thumbnailUrl: r.fileUrl }
    }
    if (provider === "cloudinary") {
      const r = await cloudinary.uploadCloudinary({ buffer: thumbBuffer, key, contentType: "image/jpeg" })
      return { thumbnailKey: r.storageKey, thumbnailUrl: r.thumbnailUrl || r.fileUrl }
    }
    if (provider === "s3") {
      const r = await s3.uploadS3({ buffer: thumbBuffer, key, contentType: "image/jpeg" })
      return { thumbnailKey: r.storageKey, thumbnailUrl: r.fileUrl }
    }
    if (provider === "azure") {
      const r = await azure.uploadAzure({ buffer: thumbBuffer, key, contentType: "image/jpeg" })
      return { thumbnailKey: r.storageKey, thumbnailUrl: r.fileUrl }
    }
  } catch {
    return null
  }
  return null
}

export async function readDocumentFile(doc) {
  if (doc.storageProvider === "local") {
    return local.downloadLocal(doc.storageKey)
  }
  if (doc.storageProvider === "s3") {
    return s3.downloadS3(doc.storageKey)
  }
  if (doc.storageProvider === "azure") {
    const url = await azure.getAzureSignedUrl(doc.storageKey)
    if (!url) throw new Error("Document file not available")
    const res = await fetch(url)
    if (!res.ok) throw new Error("Failed to fetch document from Azure")
    return Buffer.from(await res.arrayBuffer())
  }
  if (doc.fileUrl) {
    const res = await fetch(doc.fileUrl)
    if (!res.ok) throw new Error("Failed to fetch document from storage")
    return Buffer.from(await res.arrayBuffer())
  }
  throw new Error("Document file not available")
}

export async function readThumbnailFile(doc) {
  if (!doc.thumbnailKey) return null
  if (doc.storageProvider === "local") {
    return local.downloadLocal(doc.thumbnailKey)
  }
  if (doc.storageProvider === "s3") {
    return s3.downloadS3(doc.thumbnailKey)
  }
  if (doc.storageProvider === "azure") {
    const url = await azure.getAzureSignedUrl(doc.thumbnailKey)
    if (!url) return null
    const res = await fetch(url)
    if (!res.ok) throw new Error("Failed to fetch thumbnail")
    return Buffer.from(await res.arrayBuffer())
  }
  if (doc.thumbnailUrl) {
    const res = await fetch(doc.thumbnailUrl)
    if (!res.ok) throw new Error("Failed to fetch thumbnail")
    return Buffer.from(await res.arrayBuffer())
  }
  return null
}

export async function getSignedDownloadUrl(doc) {
  if (doc.storageProvider === "s3") {
    const url = await s3.getS3SignedUrl(doc.storageKey)
    if (url) return url
  }
  if (doc.storageProvider === "azure") {
    const url = await azure.getAzureSignedUrl(doc.storageKey)
    if (url) return url
  }
  return doc.fileUrl || null
}

export async function deleteDocumentFiles(doc) {
  const provider = doc.storageProvider || "local"
  if (provider === "local") {
    await local.deleteLocal(doc.storageKey)
    if (doc.thumbnailKey) await local.deleteLocal(doc.thumbnailKey)
    return
  }
  if (provider === "cloudinary") {
    await cloudinary.deleteCloudinary(doc.storageKey)
    return
  }
  if (provider === "s3") {
    await s3.deleteS3(doc.storageKey)
    if (doc.thumbnailKey) await s3.deleteS3(doc.thumbnailKey)
    return
  }
  if (provider === "azure") {
    await azure.deleteAzure(doc.storageKey)
    if (doc.thumbnailKey) await azure.deleteAzure(doc.thumbnailKey)
  }
}
