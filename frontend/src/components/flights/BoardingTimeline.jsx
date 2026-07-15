"use client"

export default function BoardingTimeline({ flight }) {
  const steps = [
    { label: "Check-in opens", done: true },
    { label: "Boarding", done: ["Boarding", "In Air", "Landed"].includes(flight.status), time: flight.boardingTime },
    { label: "Departure", done: ["In Air", "Landed"].includes(flight.status), time: flight.departureTime },
    { label: "Landed", done: flight.status === "Landed", time: flight.actualArrival || flight.arrivalTime },
  ]

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase">Boarding progress</p>
      <div className="flex gap-1">
        {steps.map((s, i) => (
          <div key={i} className="flex-1">
            <div className={`h-1.5 rounded-full ${s.done ? "bg-primary" : "bg-muted"}`} />
            <p className="text-[10px] mt-1 text-muted-foreground truncate">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
