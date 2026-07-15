import { randomUUID } from "crypto"
import {
  PACKING_CATEGORY_IDS,
  categoryLabel,
  normalizePackingCategory,
  emptyCategories,
  DEFAULT_BAGGAGE_KG,
} from "../constants/packingCategories.js"

export function throwStatus(message, statusCode = 400) {
  const err = new Error(message)
  err.statusCode = statusCode
  throw err
}

export function createPackingItem({
  name,
  category = "miscellaneous",
  packed = false,
  quantity = 1,
  weightKg = 0,
  essential = false,
  source = "ai",
  travelerId = "owner",
  travelerName = "",
  shared = false,
  missing = false,
  notes = "",
  id,
}) {
  return {
    id: id || randomUUID(),
    name: String(name || "").trim().slice(0, 200),
    category: normalizePackingCategory(category),
    packed: Boolean(packed),
    quantity: Math.max(1, Number(quantity) || 1),
    weightKg: Math.max(0, Number(weightKg) || 0),
    essential: Boolean(essential),
    source,
    travelerId: String(travelerId || "owner"),
    travelerName: String(travelerName || "").slice(0, 80),
    shared: Boolean(shared),
    missing: Boolean(missing),
    notes: String(notes || "").slice(0, 500),
  }
}

export function inferTravelStyle(tags = [], budget = {}) {
  const t = new Set((tags || []).map((x) => String(x).toLowerCase()))
  if (t.has("family")) return "family"
  if (t.has("romantic")) return "couple"
  if (t.has("solo")) return "solo"
  if (t.has("adventure") || t.has("mountain")) return "adventure"
  if (t.has("luxury")) return "business"
  if (budget?.max && budget.max > 50000) return "business"
  return "general"
}

export function activityPackingItems(activities = []) {
  const items = []
  const names = (activities || []).map((a) => String(a?.name || a?.category || "").toLowerCase()).join(" ")

  const add = (name, category, weightKg = 0.3) => {
    items.push(createPackingItem({ name, category, weightKg, source: "activity", essential: false }))
  }

  if (/trek|hike|trail|mountain/.test(names)) {
    add("Hiking Shoes", "clothing", 0.9)
    add("Water Bottle", "accessories", 0.4)
    add("Energy Bars", "food", 0.3)
    add("Rain Jacket", "clothing", 0.5)
  }
  if (/beach|swim|snorkel|surf/.test(names)) {
    add("Swimsuit", "clothing", 0.2)
    add("Sunglasses", "accessories", 0.1)
    add("Beach Towel", "accessories", 0.4)
    add("Sunscreen SPF 50", "toiletries", 0.2)
  }
  if (/ski|snow|winter/.test(names)) {
    add("Thermal Wear", "clothing", 0.6)
    add("Wool Socks", "clothing", 0.2)
    add("Gloves", "clothing", 0.15)
    add("Snow Boots", "clothing", 1.2)
  }
  if (/temple|spiritual|mosque|church/.test(names)) {
    add("Modest Clothing", "clothing", 0.4)
    add("Scarf / Cover-up", "accessories", 0.1)
  }
  if (/camera|photo|sightseeing/.test(names)) {
    add("Camera", "photography", 0.8)
    add("Power Bank", "electronics", 0.35)
  }

  return items
}

export function documentPackingItems(missingDocs = {}) {
  const items = []
  const checklist = missingDocs?.checklist || []
  for (const doc of checklist) {
    items.push(
      createPackingItem({
        name: doc.label,
        category: "documents",
        essential: Boolean(doc.required),
        missing: true,
        source: "document",
        weightKg: 0.05,
      }),
    )
  }
  const essentials = ["Passport", "Travel Insurance", "Flight Tickets", "Hotel Voucher"]
  for (const name of essentials) {
    if (!items.some((i) => i.name.toLowerCase().includes(name.split(" ")[0].toLowerCase()))) {
      items.push(
        createPackingItem({
          name,
          category: "documents",
          essential: true,
          source: "document",
          weightKg: 0.05,
        }),
      )
    }
  }
  return items
}

export function mergeItemsIntoCategories(categories, items = []) {
  const next = { ...categories }
  for (const cat of PACKING_CATEGORY_IDS) {
    if (!Array.isArray(next[cat])) next[cat] = []
  }
  for (const item of items) {
    const cat = normalizePackingCategory(item.category)
    const exists = next[cat].some((i) => i.name.toLowerCase() === item.name.toLowerCase())
    if (!exists) next[cat].push(item)
  }
  return next
}

export function flattenCategories(categories = {}) {
  const all = []
  for (const cat of PACKING_CATEGORY_IDS) {
    for (const item of categories[cat] || []) {
      all.push({ ...item, category: cat })
    }
  }
  return all
}

export function findItemInList(packingList, itemId) {
  for (const cat of PACKING_CATEGORY_IDS) {
    const idx = (packingList.categories?.[cat] || []).findIndex((i) => i.id === itemId)
    if (idx >= 0) return { category: cat, index: idx, location: "categories" }
  }
  const customIdx = (packingList.customItems || []).findIndex((i) => i.id === itemId)
  if (customIdx >= 0) return { category: null, index: customIdx, location: "customItems" }
  return null
}

export function computeProgress(categories = {}, customItems = []) {
  const all = [...flattenCategories(categories), ...(customItems || [])]
  const total = all.length
  const packed = all.filter((i) => i.packed).length
  const percent = total ? Math.round((packed / total) * 100) : 0
  return { total, packed, unpacked: total - packed, percent }
}

export function buildGenerationHash(ctx) {
  const key = JSON.stringify({
    destination: ctx.destination,
    days: ctx.totalDays,
    startDate: ctx.startDate,
    tags: ctx.tags,
    weather: ctx.weatherSummary,
    activities: (ctx.activities || []).slice(0, 40).map((a) => a.name),
  })
  let hash = 0
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return `pack-${hash.toString(16)}`
}

export function preservePackedState(oldCategories, newCategories) {
  const packedMap = new Map()
  for (const item of flattenCategories(oldCategories)) {
    if (item.packed) packedMap.set(item.name.toLowerCase(), true)
  }
  const result = emptyCategories()
  for (const cat of PACKING_CATEGORY_IDS) {
    result[cat] = (newCategories[cat] || []).map((item) => ({
      ...item,
      packed: packedMap.get(item.name.toLowerCase()) || false,
    }))
  }
  return result
}

export function serializePackingList(doc) {
  const d = doc.toObject ? doc.toObject() : doc
  const progress = computeProgress(d.categories, d.customItems)
  const weightByCategory = {}
  for (const [k, v] of Object.entries(d.weightByCategory || {})) {
    weightByCategory[k] = Number(v) || 0
  }
  return {
    id: String(d._id),
    tripId: String(d.tripId),
    userId: String(d.userId),
    generatedByAI: Boolean(d.generatedByAI),
    travelStyle: d.travelStyle || "general",
    categories: d.categories || emptyCategories(),
    customItems: d.customItems || [],
    completedItems: d.completedItems || [],
    estimatedWeight: d.estimatedWeight || 0,
    weightByCategory,
    baggageAllowanceKg: d.baggageAllowanceKg || DEFAULT_BAGGAGE_KG,
    overweight: (d.estimatedWeight || 0) > (d.baggageAllowanceKg || DEFAULT_BAGGAGE_KG),
    insights: d.insights || [],
    notes: d.notes || "",
    progress,
    lastGeneratedAt: d.lastGeneratedAt || d.updatedAt,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }
}

export function filterItems(packingList, { q, packed, category, missing } = {}) {
  let items = [...flattenCategories(packingList.categories), ...(packingList.customItems || [])]
  if (q) {
    const needle = String(q).toLowerCase()
    items = items.filter((i) => i.name.toLowerCase().includes(needle))
  }
  if (packed === "true") items = items.filter((i) => i.packed)
  if (packed === "false") items = items.filter((i) => !i.packed)
  if (missing === "true") items = items.filter((i) => i.missing)
  if (category) items = items.filter((i) => i.category === normalizePackingCategory(category))
  return items
}

export { categoryLabel, PACKING_CATEGORY_IDS, emptyCategories }
