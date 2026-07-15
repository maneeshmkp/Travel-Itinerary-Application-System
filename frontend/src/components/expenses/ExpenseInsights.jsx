import { Lightbulb } from "lucide-react"

export default function ExpenseInsights({ insights = [] }) {
  if (!insights.length) return null

  return (
    <div className="rounded-xl border border-border bg-primary/5 p-4 space-y-2">
      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-primary" />
        Smart insights
      </p>
      <ul className="space-y-1.5">
        {insights.map((text) => (
          <li key={text} className="text-sm text-muted-foreground flex gap-2">
            <span className="text-primary shrink-0">•</span>
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
