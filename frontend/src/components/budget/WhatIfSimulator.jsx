"use client"

import { useState } from "react"
import { Calculator } from "lucide-react"
import { formatMoney } from "../../utils/budgetCalculations"

export default function WhatIfSimulator({ currency, onSimulate, simulation, saving }) {
  const [transportMode, setTransportMode] = useState("current")
  const [hotelPrice, setHotelPrice] = useState("")
  const [flightPrice, setFlightPrice] = useState("")
  const [extraSavings, setExtraSavings] = useState("")

  const run = () => {
    onSimulate?.({
      transportMode: transportMode === "current" ? undefined : transportMode,
      hotelPrice: hotelPrice ? Number(hotelPrice) : undefined,
      flightPrice: flightPrice ? Number(flightPrice) : undefined,
      extraSavings: extraSavings ? Number(extraSavings) : undefined,
    })
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">What-if simulator</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Change hotel, flight, transport, or activities to instantly see the new total budget.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">Transport</span>
          <select
            value={transportMode}
            onChange={(e) => setTransportMode(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          >
            <option value="current">Keep current</option>
            <option value="metro">Switch to metro</option>
            <option value="taxi">Use more taxis</option>
          </select>
        </label>
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">Hotel price</span>
          <input
            type="number"
            min="0"
            placeholder="New hotel total"
            value={hotelPrice}
            onChange={(e) => setHotelPrice(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">Flight price</span>
          <input
            type="number"
            min="0"
            placeholder="New flight total"
            value={flightPrice}
            onChange={(e) => setFlightPrice(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">Extra savings</span>
          <input
            type="number"
            min="0"
            placeholder="Additional cuts"
            value={extraSavings}
            onChange={(e) => setExtraSavings(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={run}
        disabled={saving}
        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
      >
        {saving ? "Calculating…" : "Calculate"}
      </button>

      {simulation ? (
        <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
          <p>
            Simulated total: <strong>{formatMoney(simulation.simulatedBudget, currency)}</strong>
          </p>
          <p className="text-emerald-600">
            Savings: {formatMoney(simulation.savings, currency)}
            {simulation.delta !== 0 ? ` (${simulation.delta > 0 ? "+" : ""}${formatMoney(simulation.delta, currency)} vs plan)` : ""}
          </p>
        </div>
      ) : null}
    </div>
  )
}
