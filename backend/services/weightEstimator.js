import { PACKING_CATEGORY_IDS } from "../constants/packingCategories.js"
import { flattenCategories } from "../utils/packingHelpers.js"

const DEFAULT_ITEM_WEIGHTS = {
  clothing: 0.35,
  electronics: 0.45,
  documents: 0.05,
  medicines: 0.1,
  toiletries: 0.15,
  accessories: 0.2,
  photography: 0.7,
  emergency_kit: 0.25,
  food: 0.2,
  miscellaneous: 0.15,
}

export function estimateItemWeight(item) {
  const explicit = Number(item.weightKg)
  if (Number.isFinite(explicit) && explicit > 0) {
    return explicit * (Number(item.quantity) || 1)
  }
  const base = DEFAULT_ITEM_WEIGHTS[item.category] || 0.15
  return base * (Number(item.quantity) || 1)
}

export function estimatePackingWeight(categories = {}, customItems = []) {
  const weightByCategory = {}
  for (const cat of PACKING_CATEGORY_IDS) weightByCategory[cat] = 0

  const all = [...flattenCategories(categories), ...(customItems || [])]
  for (const item of all) {
    const w = estimateItemWeight(item)
    const cat = item.category || "miscellaneous"
    weightByCategory[cat] = (weightByCategory[cat] || 0) + w
  }

  const total = Object.values(weightByCategory).reduce((s, v) => s + v, 0)
  return {
    estimatedWeight: Math.round(total * 100) / 100,
    weightByCategory: Object.fromEntries(
      Object.entries(weightByCategory).map(([k, v]) => [k, Math.round(v * 100) / 100]),
    ),
  }
}

export function baggageWarning(estimatedWeight, allowanceKg) {
  const allowance = Number(allowanceKg) || 23
  const weight = Number(estimatedWeight) || 0
  if (weight <= allowance) {
    return { overweight: false, message: `Within baggage limit (${weight}kg / ${allowance}kg)` }
  }
  return {
    overweight: true,
    message: `Estimated luggage ${weight}kg exceeds allowance ${allowance}kg by ${Math.round((weight - allowance) * 10) / 10}kg`,
  }
}
