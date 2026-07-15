import { AlertTriangle } from "lucide-react"
import { getWarningMessage, getWarningStyles } from "./expenseUtils"

export default function ExpenseWarnings({ budget, currency }) {
  const level = budget?.warningLevel
  const message = getWarningMessage(level, budget, currency)
  if (!message) return null

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${getWarningStyles(level)}`}
      role="alert"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  )
}
