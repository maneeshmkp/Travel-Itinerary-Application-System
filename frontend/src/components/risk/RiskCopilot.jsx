"use client"

import { useState } from "react"
import { Loader2, MessageCircle, Sparkles } from "lucide-react"

const QUICK = [
  "Is my trip safe?",
  "What should I change?",
  "Can I reduce travel time?",
  "Why did AI recommend this?",
]

export default function RiskCopilot({ onAsk, disabled }) {
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async (q) => {
    const text = q || question
    if (!text.trim() || !onAsk) return
    setLoading(true)
    try {
      const res = await onAsk(text.trim())
      setAnswer(res?.answer || "No answer")
    } catch {
      setAnswer("Could not reach AI assistant.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-primary" />
        Risk copilot
      </h3>
      <div className="flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            disabled={disabled || loading}
            onClick={() => {
              setQuestion(q)
              submit(q)
            }}
            className="text-xs px-2.5 py-1 rounded-full border border-border hover:bg-muted disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Ask about trip safety or changes…"
          className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
          disabled={disabled || loading}
        />
        <button
          type="button"
          disabled={disabled || loading}
          onClick={() => submit()}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 inline-flex items-center gap-1"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Ask
        </button>
      </div>
      {answer ? <p className="text-sm text-muted-foreground border-t border-border pt-3">{answer}</p> : null}
    </div>
  )
}
