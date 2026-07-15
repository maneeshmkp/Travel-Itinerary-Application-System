import { getDb } from "./db.js"
import { STORES } from "./constants.js"
import { encryptPayload, decryptPayload } from "./crypto.js"

function uuid() {
  return crypto.randomUUID?.() || `q-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export async function enqueueMutation({
  action,
  method,
  url,
  body = null,
  headers = {},
  entityType,
  entityId = null,
  clientId = null,
  optimistic = null,
}) {
  const db = await getDb()
  const id = uuid()
  const encryptedBody = body ? await encryptPayload(body) : null

  const item = {
    id,
    action,
    method: method.toUpperCase(),
    url,
    body: encryptedBody,
    headers,
    entityType,
    entityId,
    clientId: clientId || id,
    optimistic,
    status: "pending",
    retries: 0,
    createdAt: Date.now(),
    idempotencyKey: id,
  }

  await db.put(STORES.QUEUE, item)
  return item
}

export async function listQueue(status = "pending") {
  const db = await getDb()
  const all = await db.getAllFromIndex(STORES.QUEUE, "status", status)
  return all.sort((a, b) => a.createdAt - b.createdAt)
}

export async function listAllQueue() {
  const db = await getDb()
  return db.getAll(STORES.QUEUE)
}

export async function getQueueItem(id) {
  const db = await getDb()
  return db.get(STORES.QUEUE, id)
}

export async function updateQueueItem(id, patch) {
  const db = await getDb()
  const existing = await db.get(STORES.QUEUE, id)
  if (!existing) return null
  const updated = { ...existing, ...patch }
  await db.put(STORES.QUEUE, updated)
  return updated
}

export async function removeQueueItem(id) {
  const db = await getDb()
  await db.delete(STORES.QUEUE, id)
}

export async function decryptQueueBody(item) {
  if (!item?.body) return null
  return decryptPayload(item.body)
}

export async function queueAiRequest(prompt, meta = {}) {
  const db = await getDb()
  const id = uuid()
  const encrypted = await encryptPayload({ prompt, ...meta })
  await db.put(STORES.AI_QUEUE, {
    id,
    body: encrypted,
    status: "pending",
    createdAt: Date.now(),
  })
  await enqueueMutation({
    action: "ai.request",
    method: "POST",
    url: meta.url || "/ai/itinerary",
    body: { prompt, ...meta },
    entityType: "ai",
    clientId: id,
  })
  return id
}

export async function listAiQueue() {
  const db = await getDb()
  return db.getAll(STORES.AI_QUEUE)
}
