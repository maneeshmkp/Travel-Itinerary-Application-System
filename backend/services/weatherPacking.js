import { createPackingItem } from "../utils/packingHelpers.js"

export function weatherPackingItems(forecast = []) {
  const items = []
  const seen = new Set()

  const add = (name, category, weightKg = 0.3, essential = false) => {
    const key = name.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    items.push(
      createPackingItem({
        name,
        category,
        weightKg,
        essential,
        source: "weather",
      }),
    )
  }

  let rainDays = 0
  let coldDays = 0
  let hotDays = 0
  let maxTemp = -100
  let minTemp = 100

  for (const day of forecast || []) {
    const condition = String(day.condition || day.weather || day.label || "").toLowerCase()
    const max = Number(day.tempMax ?? day.maxTemp ?? day.temp?.max)
    const min = Number(day.tempMin ?? day.minTemp ?? day.temp?.min)
    if (Number.isFinite(max)) maxTemp = Math.max(maxTemp, max)
    if (Number.isFinite(min)) minTemp = Math.min(minTemp, min)
    if (condition.includes("rain") || condition.includes("drizzle") || condition.includes("storm")) rainDays += 1
    if (Number.isFinite(min) && min <= 10) coldDays += 1
    if (Number.isFinite(max) && max >= 32) hotDays += 1
  }

  if (rainDays >= 1) {
    add("Raincoat", "clothing", 0.5, true)
    add("Umbrella", "accessories", 0.35, true)
    add("Waterproof Bag Cover", "accessories", 0.15)
    add("Quick Dry Clothes", "clothing", 0.4)
  }

  if (coldDays >= 1 || minTemp <= 5) {
    add("Winter Jacket", "clothing", 1.1, true)
    add("Thermal Wear", "clothing", 0.5)
    add("Wool Socks", "clothing", 0.15)
    add("Gloves", "clothing", 0.12)
    if (minTemp <= 0) add("Snow Boots", "clothing", 1.2)
  }

  if (hotDays >= 1 || maxTemp >= 30) {
    add("Sunscreen SPF 50", "toiletries", 0.2, true)
    add("Cap / Hat", "accessories", 0.1)
    add("Sunglasses", "accessories", 0.1)
    add("Light Cotton Clothes", "clothing", 0.4)
  }

  if (maxTemp >= 25) add("Sandals", "clothing", 0.35)

  add("Power Bank", "electronics", 0.35)

  const insights = []
  if (rainDays >= 2) insights.push("Heavy rain expected — pack umbrella and raincoat.")
  if (coldDays >= 1) insights.push("Cold weather expected — bring thermal wear and jacket.")
  if (hotDays >= 1) insights.push("Hot weather expected — pack sunscreen and light clothing.")
  if (minTemp <= 0) insights.push("Freezing temperatures possible — pack warm layers.")

  return { items, insights, summary: { rainDays, coldDays, hotDays, maxTemp, minTemp } }
}
