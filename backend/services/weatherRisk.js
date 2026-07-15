import { createRiskItem } from "../utils/riskHelpers.js"

const INDOOR_ALTERNATIVES = [
  { name: "Indoor museum visit", category: "cultural", reason: "Stay dry while exploring local history" },
  { name: "Shopping mall", category: "shopping", reason: "Sheltered shopping and dining" },
  { name: "Aquarium or science center", category: "sightseeing", reason: "Family-friendly indoor option" },
  { name: "Local restaurant experience", category: "dining", reason: "Enjoy regional cuisine indoors" },
]

function rainAlternatives(destination) {
  return INDOOR_ALTERNATIVES.map((a) => ({
    ...a,
    location: destination || "city center",
    time: "11:00",
  }))
}

export function detectWeatherRisks(forecast = [], destination = "") {
  const risks = []
  let rainDays = 0
  let stormDays = 0
  let hotDays = 0
  let coldDays = 0

  for (const day of forecast || []) {
    const condition = String(day.condition || day.label || "").toLowerCase()
    const max = Number(day.temp?.max ?? day.tempMax)
    const min = Number(day.temp?.min ?? day.tempMin)
    const dayNum = day.dayNumber

    if (condition.includes("storm") || condition.includes("thunder")) {
      stormDays += 1
      risks.push(
        createRiskItem({
          riskType: "storm",
          severity: "HIGH",
          title: `Storm expected on Day ${dayNum || "?"}`,
          description: `${day.label || "Storm"} forecast — outdoor plans may be unsafe.`,
          affectedDay: dayNum,
          source: "weather",
          recommendation: {
            title: "Switch to indoor activities",
            description: "Avoid open areas, beaches, and mountain trails during storms.",
            suggestions: [
              "Move beach or trekking to a clearer day",
              "Book indoor attractions in advance",
              "Allow extra travel buffer for transport delays",
            ],
            alternativeActivities: rainAlternatives(destination),
          },
          metadata: { date: day.date, condition },
        }),
      )
    } else if (condition.includes("rain") || condition.includes("drizzle")) {
      rainDays += 1
      risks.push(
        createRiskItem({
          riskType: "heavy_rain",
          severity: rainDays >= 2 ? "HIGH" : "MEDIUM",
          title: `Heavy rain on Day ${dayNum || "?"}`,
          description: `${day.label || "Rain"} — beach and outdoor sightseeing may be unpleasant.`,
          affectedDay: dayNum,
          source: "weather",
          recommendation: {
            title: "Swap outdoor plans for indoor options",
            description: "Visit a museum today because of rain instead of the beach.",
            suggestions: [
              "Pack raincoat and umbrella",
              "Move beach activity to tomorrow if forecast clears",
              "Use metro instead of walking long distances",
            ],
            alternativeActivities: rainAlternatives(destination),
          },
          metadata: { date: day.date, condition },
        }),
      )
    }

    if (Number.isFinite(max) && max >= 38) {
      hotDays += 1
      risks.push(
        createRiskItem({
          riskType: "extreme_heat",
          severity: "MEDIUM",
          title: `Extreme heat on Day ${dayNum || "?"}`,
          description: `High of ${max}°C — heat exhaustion risk during midday activities.`,
          affectedDay: dayNum,
          source: "weather",
          recommendation: {
            title: "Schedule outdoor activities early morning",
            suggestions: [
              "Carry water and sunscreen",
              "Prefer shaded or air-conditioned venues noon–4pm",
              "Use taxi or metro instead of long walks",
            ],
          },
          metadata: { maxTemp: max },
        }),
      )
    }

    if (Number.isFinite(min) && min <= 0) {
      coldDays += 1
      risks.push(
        createRiskItem({
          riskType: "snow",
          severity: "MEDIUM",
          title: `Freezing conditions on Day ${dayNum || "?"}`,
          description: `Low of ${min}°C — snow or ice possible on roads.`,
          affectedDay: dayNum,
          source: "weather",
          recommendation: {
            suggestions: ["Pack thermal layers", "Check road conditions before mountain drives"],
          },
          metadata: { minTemp: min },
        }),
      )
    }

    if (condition.includes("cyclone") || condition.includes("hurricane")) {
      risks.push(
        createRiskItem({
          riskType: "cyclone",
          severity: "CRITICAL",
          title: "Cyclone alert",
          description: "Severe weather system detected — reconsider travel plans.",
          affectedDay: dayNum,
          source: "weather",
          recommendation: {
            title: "Monitor official advisories",
            suggestions: [
              "Contact airline and hotel for rebooking options",
              "Avoid coastal and exposed areas",
            ],
          },
        }),
      )
    }
  }

  return {
    risks,
    summary: { rainDays, stormDays, hotDays, coldDays },
  }
}
