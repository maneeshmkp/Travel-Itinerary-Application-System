"use client"

export default function GateCard({ flight }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      <div className="rounded-md bg-muted/40 px-3 py-2 text-center">
        <p className="text-[10px] uppercase text-muted-foreground">Terminal</p>
        <p className="font-bold text-lg">{flight.terminal || "—"}</p>
      </div>
      <div className="rounded-md bg-primary/10 px-3 py-2 text-center">
        <p className="text-[10px] uppercase text-muted-foreground">Gate</p>
        <p className="font-bold text-lg text-primary">{flight.gate || "—"}</p>
        {flight.previousGate && flight.previousGate !== flight.gate ? (
          <p className="text-[10px] text-amber-600">was {flight.previousGate}</p>
        ) : null}
      </div>
      <div className="rounded-md bg-muted/40 px-3 py-2 text-center col-span-2 sm:col-span-1">
        <p className="text-[10px] uppercase text-muted-foreground">Aircraft</p>
        <p className="font-semibold text-sm">{flight.aircraftType || "—"}</p>
      </div>
    </div>
  )
}
