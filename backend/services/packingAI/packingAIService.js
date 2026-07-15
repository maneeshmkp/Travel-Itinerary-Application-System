import { llmChatJson } from "../aiService.js"
import {
  createPackingItem,
  emptyCategories,
  mergeItemsIntoCategories,
} from "../../utils/packingHelpers.js"
import { PACKING_CATEGORY_IDS, normalizePackingCategory } from "../../constants/packingCategories.js"

function clip(obj) {
  const s = JSON.stringify(obj)
  return s.length > 24000 ? s.slice(0, 24000) + "…" : s
}

function normalizeAiItem(raw, category) {
  if (!raw) return null
  const name = typeof raw === "string" ? raw : raw.name || raw.item
  if (!name) return null
  return createPackingItem({
    name: String(name).trim(),
    category: normalizePackingCategory(raw.category || category),
    weightKg: Number(raw.weightKg) || 0,
    essential: Boolean(raw.essential),
    quantity: Number(raw.quantity) || 1,
    source: "ai",
  })
}

function categoriesFromAiPayload(parsed) {
  const categories = emptyCategories()
  if (!parsed || typeof parsed !== "object") return categories

  for (const cat of PACKING_CATEGORY_IDS) {
    const list = parsed[cat] || parsed[cat === "medicines" ? "medicine" : cat]
    if (!Array.isArray(list)) continue
    categories[cat] = list.map((item) => normalizeAiItem(item, cat)).filter(Boolean)
  }

  return categories
}

function demoPackingList(ctx) {
  const dest = String(ctx.destination || "").toLowerCase()
  const categories = emptyCategories()

  const push = (cat, names) => {
    categories[cat].push(...names.map((name) => createPackingItem({ name, category: cat, source: "ai" })))
  }

  push("clothing", ["T-Shirts", "Underwear", "Sleepwear", "Comfortable Walking Shoes"])
  push("toiletries", ["Toothbrush", "Toothpaste", "Shampoo", "Deodorant"])
  push("electronics", ["Phone Charger", "Power Bank", "Travel Adapter"])
  push("documents", ["Passport / ID", "Travel Insurance", "Flight Tickets"])
  push("medicines", ["Pain Reliever", "Band-Aids", "Prescription Medicines"])
  push("miscellaneous", ["Reusable Water Bottle", "Snacks"])

  if (dest.includes("goa") || dest.includes("beach")) {
    push("clothing", ["Swimwear", "Flip Flops", "Light Cotton Clothes"])
    push("toiletries", ["Sunscreen SPF 50", "After-sun Lotion"])
    push("accessories", ["Sunglasses", "Beach Hat"])
  }
  if (dest.includes("manali") || dest.includes("shimla") || dest.includes("snow")) {
    push("clothing", ["Winter Jacket", "Thermal Wear", "Wool Socks", "Gloves"])
    push("accessories", ["Woolen Cap", "Lip Balm"])
  }
  if (ctx.travelStyle === "family") {
    push("miscellaneous", ["Kids Snacks", "Entertainment for Kids"])
  }
  if (ctx.travelStyle === "adventure") {
    push("clothing", ["Hiking Shoes", "Quick Dry Pants"])
    push("emergency_kit", ["First Aid Kit", "Whistle"])
  }

  const insights = ["Demo packing list generated — add GEMINI_API_KEY or OPENAI_API_KEY for personalized AI lists."]
  if (ctx.weatherSummary?.rainDays >= 1) {
    insights.push("Rain expected — include raincoat and umbrella.")
    push("clothing", ["Raincoat"])
    push("accessories", ["Umbrella"])
  }

  return {
    demo: true,
    categories,
    insights,
    notes: `Packing list for ${ctx.destination || "your trip"} (${ctx.totalDays || "?"} days)`,
  }
}

export async function generateAIPackingList(context) {
  const system = `You are an expert travel packing assistant like PackPoint.
Return ONLY valid JSON (no markdown) with this exact shape:
{
  "clothing": [{"name":"item","quantity":1,"weightKg":0.3,"essential":true}],
  "electronics": [],
  "documents": [],
  "medicines": [],
  "toiletries": [],
  "accessories": [],
  "photography": [],
  "emergency_kit": [],
  "food": [],
  "miscellaneous": [],
  "insights": ["short tip"],
  "notes": "one sentence summary"
}
Personalize for destination, season, weather, trip duration, activities, travel style, and budget.
Include practical items only. Never return plain text outside JSON.`

  const user = `Generate a packing list for:
${clip(context)}`

  const { demo, parsed } = await llmChatJson({ system, user })

  if (!demo && parsed && typeof parsed === "object") {
    return {
      demo: false,
      categories: categoriesFromAiPayload(parsed),
      insights: Array.isArray(parsed.insights) ? parsed.insights.map(String).slice(0, 8) : [],
      notes: String(parsed.notes || "").slice(0, 500),
    }
  }

  return demoPackingList(context)
}

export function mergeAllPackingSources({ aiCategories, weatherItems, activityItems, documentItems }) {
  let categories = { ...aiCategories }
  categories = mergeItemsIntoCategories(categories, weatherItems)
  categories = mergeItemsIntoCategories(categories, activityItems)
  categories = mergeItemsIntoCategories(categories, documentItems)
  return categories
}
