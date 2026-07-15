"use client"

import { useState } from "react"
import { Send, Sparkles } from "lucide-react"

export default function BudgetCopilot({ onAsk, disabled }) {
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [asking, setAsking] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!question.trim() || !onAsk) return
    setAsking(true)
    try {
      const res = await onAsk(question.trim())
      setAnswer(res?.answer || "No answer available.")
    } catch {
      setAnswer("Could not get an answer. Try again.")
    } finally {
      setAsking(false)
    }
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">Budget copilot</p>
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="How can I save money? Which hotel is cheaper?"
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
          disabled={disabled || asking}
        />
        <button
          type="submit"
          disabled={disabled || asking || !question.trim()}
          className="px-3 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
      {answer ? <p className="text-sm text-muted-foreground">{answer}</p> : null}
    </div>
  )
}
