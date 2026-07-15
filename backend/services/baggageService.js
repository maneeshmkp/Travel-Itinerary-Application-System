export function estimateBaggageClaim({ status, gate, flightNumber }) {
  if (status !== "Landed") return { belt: "", message: "Baggage belt assigned after landing" }

  const fn = String(flightNumber || "")
  const num = (fn.charCodeAt(fn.length - 1) || 49) % 8
  const belt = String(num + 1)

  return {
    belt,
    message: `Baggage claim belt is ${belt}`,
    estimatedMinutes: 12 + (num % 5),
  }
}

export function mergeBaggageIntoStatus(flightData) {
  if (flightData.baggageClaim) return flightData
  const est = estimateBaggageClaim({
    status: flightData.status,
    gate: flightData.gate,
    flightNumber: flightData.flightNumber,
  })
  return { ...flightData, baggageClaim: est.belt }
}
