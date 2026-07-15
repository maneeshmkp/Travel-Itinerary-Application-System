export async function uploadCloudinary({ buffer, key, contentType }) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary is not configured")
  }

  const base64 = buffer.toString("base64")
  const dataUri = `data:${contentType};base64,${base64}`
  const folder = process.env.CLOUDINARY_FOLDER || "travel-documents"
  const publicId = key.replace(/[/\\]/g, "_").replace(/\.[^.]+$/, "")

  const body = new URLSearchParams({
    file: dataUri,
    public_id: `${folder}/${publicId}`,
    resource_type: "auto",
  })

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Cloudinary upload failed: ${err.slice(0, 200)}`)
  }

  const data = await res.json()
  return {
    storageKey: data.public_id,
    fileUrl: data.secure_url,
    thumbnailUrl: data.eager?.[0]?.secure_url || data.secure_url,
    contentType,
  }
}

export async function deleteCloudinary(publicId) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) return

  const timestamp = Math.floor(Date.now() / 1000)
  const crypto = await import("crypto")
  const sig = crypto
    .createHash("sha1")
    .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex")

  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: apiKey,
    signature: sig,
  })

  await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: "POST",
    body,
  })
}
