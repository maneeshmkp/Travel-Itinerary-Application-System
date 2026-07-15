"use client"

import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  ArrowUpRight,
  Bot,
  ChevronRight,
  Loader2,
  History,
  Square,
  Send,
  Sparkles,
  User,
} from "lucide-react"
import { aiAPI, itineraryAPI } from "../../services/api"
import { copilotAPI, copilotStream } from "../../services/copilotApi"
import { useAuth } from "../../context/AuthContext"
import { useAskAi } from "../../context/AskAiContext"
import { useToast } from "../../hooks/useToast"
import { formatMoney } from "../../utils/budgetCalculations"
import { CopilotCardList } from "../copilot/CopilotCard"
import QuickActionsBar, { FollowUpChips } from "../copilot/QuickActions"
import VoiceInputButton from "../copilot/VoiceInputButton"
import ChatHistoryDrawer from "../copilot/ChatHistoryDrawer"
import { executeCopilotQuickAction } from "../../utils/copilotActions"
import { maybeAutoDownloadTrip } from "../../offline/tripDownload"

export const SUGGESTED_PROMPTS = [
  "Plan Goa trip under 20k",
  "Best time to visit Kerala?",
  "Weekend getaway near Delhi under ₹15k",
  "3-night beach trip in India on a budget",
]

const WELCOME_MESSAGE = {
  role: "assistant",
  content:
    "Hi! I'm your **Travel Copilot**. I remember our conversation, can edit your trip, check weather, find flights & hotels, and track expenses — all in one place.",
}

function renderInlineMarkdown(text, isUser = false) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong
          key={i}
          className={`font-semibold ${isUser ? "text-white" : "text-foreground"}`}
        >
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}

function ChatMessage({ message }) {
  const isUser = message.role === "user"

  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-primary text-white" : "bg-primary/10 text-primary ring-1 ring-primary/20"
        }`}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>
      <div
        className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-white rounded-tr-sm"
            : "bg-muted/60 text-foreground rounded-tl-sm border border-border/50"
        }`}
      >
        {String(message.content)
          .split("\n")
          .map((line, idx) => {
            const trimmed = line.trim()
            if (!trimmed) return <br key={idx} />
            if (trimmed.startsWith("- ")) {
              return (
                <p key={idx} className={`ml-1 mb-1 text-sm ${isUser ? "text-white" : ""}`}>
                  • {renderInlineMarkdown(trimmed.slice(2), isUser)}
                </p>
              )
            }
            return (
              <p key={idx} className={`${idx > 0 ? "mt-1.5" : ""} ${isUser ? "text-white" : ""}`}>
                {renderInlineMarkdown(trimmed, isUser)}
              </p>
            )
          })}
        {message.planDraft && (
          <PlanDraftCard
            planDraft={message.planDraft}
            onSuccess={message.onSuccess}
            onError={message.onError}
            onClose={message.onClose}
          />
        )}
        {!isUser && message.cards?.length > 0 && <CopilotCardList cards={message.cards} />}
        {!isUser && message.quickActions?.length > 0 && (
          <QuickActionsBar
            actions={message.quickActions}
            onAction={(a) => message.onQuickAction?.(a, message.planDraft)}
          />
        )}
      </div>
    </div>
  )
}

function PlanDraftCard({ planDraft, onSuccess, onError, onClose }) {
  const navigate = useNavigate()
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await aiAPI.generateItinerary({
        destination: planDraft.destination,
        numberOfNights: planDraft.numberOfNights,
        budget: planDraft.budget,
        travelStyle: planDraft.travelStyle,
        interests: planDraft.interests,
      })
      const itinerary = res.data?.data?.itinerary
      if (!itinerary) throw new Error("No itinerary returned")

      const payload = {
        title: itinerary.title,
        destination: itinerary.destination,
        numberOfNights: itinerary.numberOfNights,
        description: itinerary.description,
        budget: itinerary.budget,
        bestTimeToVisit: itinerary.bestTimeToVisit,
        highlights: itinerary.highlights || [],
        tags: itinerary.tags || [planDraft.travelStyle],
        days: (itinerary.days || []).map((day) => ({
          dayNumber: day.dayNumber,
          dayLabel: day.dayLabel || "",
          hotel: day.hotel,
          transfers: day.transfers || [],
          activities: (day.activities || []).map((a) => {
            const act = {
              name: a.name,
              description: a.description,
              time: a.time,
              location: a.location,
              category: a.category,
              duration: a.duration || "2-3 hours",
              cost: a.cost ?? 0,
            }
            const lat = Number(a.latitude)
            const lng = Number(a.longitude)
            if (Number.isFinite(lat) && lat >= -90 && lat <= 90) act.latitude = lat
            if (Number.isFinite(lng) && lng >= -180 && lng <= 180) act.longitude = lng
            if (a.geocodedName) act.geocodedName = a.geocodedName
            return act
          }),
          meals: day.meals || [],
        })),
      }

      const saveRes = await itineraryAPI.create(payload)
      const id = saveRes.data?.data?._id
      if (id) maybeAutoDownloadTrip(id)
      onSuccess?.("Itinerary created!")
      onClose?.()
      if (id) navigate(`/itineraries/${id}`)
    } catch (err) {
      onError?.(err?.response?.data?.message || err?.message || "Could not generate itinerary")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-primary/20 bg-background/80 p-3">
      <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1">
        <Sparkles className="h-3.5 w-3.5" />
        Trip draft
      </p>
      <dl className="text-xs space-y-1 text-muted-foreground mb-3">
        <div>
          <span className="font-medium text-foreground">Destination: </span>
          {planDraft.destination}
        </div>
        <div>
          <span className="font-medium text-foreground">Nights: </span>
          {planDraft.numberOfNights}
        </div>
        <div>
          <span className="font-medium text-foreground">Budget: </span>
          {formatMoney(planDraft.budget.min, planDraft.budget.currency)} –{" "}
          {formatMoney(planDraft.budget.max, planDraft.budget.currency)}
        </div>
      </dl>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating}
        className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-2 rounded-lg"
      >
        {generating ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Building…
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" />
            Generate itinerary
          </>
        )}
      </button>
    </div>
  )
}

/**
 * Reusable travel chat panel — used in full page and Ask AI dialog.
 */
export default function TravelChatPanel({
  variant = "page",
  initialMessage = "",
  onClose,
  className = "",
  itineraryId: propItineraryId,
  itinerarySnapshot: propSnapshot,
  onItineraryUpdated,
}) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { tripContext, setMapFocus } = useAskAi()
  const { showSuccess, showError } = useToast()
  const [messages, setMessages] = useState([{ ...WELCOME_MESSAGE, id: "welcome" }])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [streamingText, setStreamingText] = useState("")
  const [sessionId, setSessionId] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [panelKey, setPanelKey] = useState(0)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const seedHandled = useRef(false)
  const abortRef = useRef(null)

  const itineraryId = propItineraryId || tripContext?.itineraryId
  const itinerarySnapshot = propSnapshot || tripContext?.snapshot

  const isDialog = variant === "dialog"
  const showConversation = messages.some((m) => m.role === "user") || loading || streamingText

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  useEffect(() => {
    if (!initialMessage || seedHandled.current) return
    seedHandled.current = true
    if (isAuthenticated) {
      sendMessage(initialMessage)
    } else {
      setInput(initialMessage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage, isAuthenticated])

  useEffect(() => {
    if (isDialog) {
      const t = setTimeout(() => inputRef.current?.focus(), 300)
      return () => clearTimeout(t)
    }
    return undefined
  }, [isDialog])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading, streamingText])

  const handleQuickAction = async (action, msgPlanDraft) => {
    const mapCard = messages.flatMap((m) => m.cards || []).find((c) => c.type === "map")
    const result = await executeCopilotQuickAction(action, {
      navigate,
      showSuccess,
      showError,
      itineraryId,
      planDraft: msgPlanDraft,
      onMapFocus: (payload) => {
        setMapFocus?.(payload || mapCard?.data)
        tripContext?.onRefresh?.()
      },
      onRefresh: () => {
        tripContext?.onRefresh?.()
        onItineraryUpdated?.()
      },
    })
    if (result.planDraft) {
      setMessages((prev) => [
        ...prev,
        {
          id: `draft-${Date.now()}`,
          role: "assistant",
          content: "Ready to build your itinerary:",
          planDraft: result.planDraft,
        },
      ])
    }
  }

  const cancelStream = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setLoading(false)
    setStreamingText("")
  }

  const loadSession = async (id) => {
    try {
      const res = await copilotAPI.getSession(id)
      const data = res.data?.data
      setSessionId(id)
      setMessages(
        (data.messages || []).map((m, i) => ({
          id: m._id || `m-${i}`,
          role: m.role,
          content: m.content,
          cards: m.cards,
          quickActions: m.quickActions,
          followUps: m.followUps,
          planDraft: m.planDraft,
        })),
      )
      setPanelKey((k) => k + 1)
    } catch (err) {
      showError(err.message || "Could not load chat")
    }
  }

  const sendMessage = async (text) => {
    const content = String(text || "").trim()
    if (!content || loading) return

    if (!isAuthenticated) return

    const userMsg = { id: `u-${Date.now()}`, role: "user", content }
    const history = [...messages.filter((m) => m.id !== "welcome"), userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }))

    setMessages((prev) => [...prev.filter((m) => m.id !== "welcome"), userMsg])
    setInput("")
    setLoading(true)
    setStreamingText("")

    const ac = new AbortController()
    abortRef.current = ac

    const payload = {
      messages: history,
      sessionId,
      itineraryId,
      itinerarySnapshot,
    }

    try {
      let data
      try {
        data = await copilotStream(payload, {
          signal: ac.signal,
          onToken: (t) => setStreamingText((prev) => prev + t),
        })
      } catch (streamErr) {
        if (streamErr.message === "Cancelled") return
        const res = await copilotAPI.send(payload)
        data = res.data?.data || {}
      }

      if (data.sessionId) setSessionId(data.sessionId)

      const assistantMsg = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: data.reply || streamingText || "Done.",
        planDraft: data.planDraft || null,
        cards: data.cards || [],
        quickActions: data.quickActions || [],
        followUps: data.followUps || [],
      }

      setStreamingText("")
      setMessages((prev) => [...prev, assistantMsg])

      if (data.itineraryUpdated && data.itinerary) {
        onItineraryUpdated?.(data.itinerary)
        tripContext?.onRefresh?.()
        showSuccess("Itinerary updated")
      }

      const mapCard = (data.cards || []).find((c) => c.type === "map")
      if (mapCard?.data) setMapFocus?.(mapCard.data)
    } catch (err) {
      if (err.message === "Cancelled") return
      const friendly =
        err.message?.includes("Network") || !navigator.onLine
          ? "You're offline. Check your connection and try again."
          : err.message || "Copilot request failed"
      showError(friendly)
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `Sorry — ${friendly}`,
        },
      ])
    } finally {
      setLoading(false)
      setStreamingText("")
      abortRef.current = null
      inputRef.current?.focus()
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!isAuthenticated) return
    sendMessage(input)
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!isAuthenticated) return
      sendMessage(input)
    }
  }

  const messageProps = {
    onSuccess: showSuccess,
    onError: showError,
    onClose,
    onQuickAction: (action) => handleQuickAction(action),
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")

  return (
    <div className={`flex flex-col min-h-0 relative ${className}`} key={panelKey}>
      {isDialog && (
        <ChatHistoryDrawer
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          currentSessionId={sessionId}
          onSelectSession={loadSession}
          onNewChat={() => {
            setSessionId(null)
            setMessages([{ ...WELCOME_MESSAGE, id: "welcome" }])
            setPanelKey((k) => k + 1)
          }}
        />
      )}
      {itinerarySnapshot && (
        <div className="mb-3 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-foreground">
          Trip context: <strong>{itinerarySnapshot.title}</strong> · {itinerarySnapshot.destination}
        </div>
      )}
      {!isAuthenticated && (
        <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Log in
          </Link>{" "}
          to chat with the travel copilot and save itineraries.
        </div>
      )}

      {isDialog && isAuthenticated && (
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="mb-3 self-start flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
        >
          <History className="h-3.5 w-3.5" />
          Past chats
        </button>
      )}

      {isDialog && !showConversation && (
        <div className="mb-6 shrink-0">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground leading-tight mb-2">
            Let&apos;s plan your next trip
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Get destination ideas, budget tips, and day-by-day plans from our AI assistant.
          </p>
        </div>
      )}

      {showConversation && (
        <div
          className={`flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 ${
            isDialog ? "max-h-[min(42vh,360px)] mb-4" : "mb-4"
          }`}
        >
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={{ ...msg, ...messageProps }} />
          ))}
          {loading && streamingText && (
            <div className="flex gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="max-w-[88%] rounded-2xl rounded-tl-sm border border-border/50 bg-muted/50 px-3.5 py-2.5 text-sm">
                {streamingText}
                <span className="inline-block w-1.5 h-4 ml-0.5 bg-primary/60 animate-pulse align-middle" />
              </div>
            </div>
          )}
          {loading && !streamingText && (
            <div className="flex gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="rounded-2xl rounded-tl-sm border border-border/50 bg-muted/50 px-3.5 py-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {!showConversation && isDialog && (
        <div className="mb-5 shrink-0">
          <p className="text-sm font-semibold text-foreground mb-3">Try asking</p>
          <ul className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card/50 overflow-hidden">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <li key={prompt}>
                <button
                  type="button"
                  disabled={!isAuthenticated || loading}
                  onClick={() => sendMessage(prompt)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-sm text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4 text-primary shrink-0" />
                  <span className="flex-1">{prompt}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isDialog && messages.length <= 1 && !loading && (
        <div className="flex flex-wrap gap-2 mb-3 shrink-0">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => sendMessage(prompt)}
              disabled={!isAuthenticated}
              className="text-xs rounded-full border border-border bg-card px-3 py-1.5 hover:bg-muted/60 transition-colors disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {!loading && lastAssistant?.followUps?.length > 0 && (
        <FollowUpChips
          items={lastAssistant.followUps}
          disabled={!isAuthenticated}
          onSelect={(q) => sendMessage(q)}
        />
      )}

      <form
        onSubmit={handleSubmit}
        className={`shrink-0 ${isDialog ? "" : "border-t border-border pt-3"}`}
      >
        <div
          className={`flex items-end gap-2 rounded-2xl border-2 bg-background p-2 shadow-sm transition-shadow focus-within:shadow-md ${
            isDialog ? "border-primary/30 focus-within:border-primary/50" : "border-border"
          }`}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything…"
            rows={1}
            disabled={loading}
            className="ui-pill-input flex-1 min-h-[44px] max-h-28 resize-none px-2 py-2.5"
          />
          <VoiceInputButton
            disabled={loading || !isAuthenticated}
            onTranscript={(text, { autoSubmit }) => {
              setInput(text)
              if (autoSubmit) sendMessage(text)
            }}
          />
          {loading ? (
            <button
              type="button"
              onClick={cancelStream}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground hover:bg-muted/80"
              aria-label="Stop"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || !isAuthenticated}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
              aria-label="Send"
            >
              <ArrowUpRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {isDialog && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          <Link to="/chat" onClick={onClose} className="text-primary hover:underline inline-flex items-center gap-1">
            Open full chat
            <Send className="h-3 w-3" />
          </Link>
        </p>
      )}
    </div>
  )
}
