const DEVICE_KEY = "travelplan_offline_device_key"

async function getOrCreateDeviceKey() {
  let keyB64 = sessionStorage.getItem(DEVICE_KEY)
  if (keyB64) return keyB64
  const raw = crypto.getRandomValues(new Uint8Array(32))
  keyB64 = btoa(String.fromCharCode(...raw))
  sessionStorage.setItem(DEVICE_KEY, keyB64)
  return keyB64
}

async function importKey(keyB64) {
  const raw = Uint8Array.from(atob(keyB64), (c) => c.charCodeAt(0))
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"])
}

export async function encryptPayload(data) {
  try {
    const keyB64 = await getOrCreateDeviceKey()
    const key = await importKey(keyB64)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encoded = new TextEncoder().encode(JSON.stringify(data))
    const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded)
    return {
      iv: btoa(String.fromCharCode(...iv)),
      data: btoa(String.fromCharCode(...new Uint8Array(cipher))),
    }
  } catch {
    return { plain: data }
  }
}

export async function decryptPayload(stored) {
  if (stored?.plain) return stored.plain
  if (!stored?.iv || !stored?.data) return null
  try {
    const keyB64 = await getOrCreateDeviceKey()
    const key = await importKey(keyB64)
    const iv = Uint8Array.from(atob(stored.iv), (c) => c.charCodeAt(0))
    const cipher = Uint8Array.from(atob(stored.data), (c) => c.charCodeAt(0))
    const decoded = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher)
    return JSON.parse(new TextDecoder().decode(decoded))
  } catch {
    return null
  }
}
