export const PACKING_CATEGORY_IDS = [
  "clothing",
  "electronics",
  "documents",
  "medicines",
  "toiletries",
  "accessories",
  "photography",
  "emergency_kit",
  "food",
  "miscellaneous",
]

export const PACKING_CATEGORY_LABELS = {
  clothing: "Clothing",
  electronics: "Electronics",
  documents: "Travel Documents",
  medicines: "Medicines",
  toiletries: "Toiletries",
  accessories: "Accessories",
  photography: "Photography",
  emergency_kit: "Emergency Kit",
  food: "Food",
  miscellaneous: "Miscellaneous",
}

export const AI_CATEGORY_MAP = {
  clothing: "clothing",
  electronics: "electronics",
  documents: "documents",
  medicine: "medicines",
  medicines: "medicines",
  toiletries: "toiletries",
  accessories: "accessories",
  photography: "photography",
  emergency_kit: "emergency_kit",
  food: "food",
  miscellaneous: "miscellaneous",
}

export const DEFAULT_BAGGAGE_KG = 23
export const DEFAULT_CABIN_BAGGAGE_KG = 7

export function normalizePackingCategory(value) {
  const v = String(value || "miscellaneous").toLowerCase().trim().replace(/\s+/g, "_")
  return AI_CATEGORY_MAP[v] || (PACKING_CATEGORY_IDS.includes(v) ? v : "miscellaneous")
}

export function categoryLabel(category) {
  return PACKING_CATEGORY_LABELS[normalizePackingCategory(category)] || "Miscellaneous"
}

export function emptyCategories() {
  return Object.fromEntries(PACKING_CATEGORY_IDS.map((id) => [id, []]))
}
