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

export function categoryLabel(category) {
  return PACKING_CATEGORY_LABELS[category] || "Miscellaneous"
}
