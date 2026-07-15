"use client"

import { useEffect } from "react"
import { createPortal } from "react-dom"
import { X, Sparkles, MessageCircle } from "lucide-react"
import { useAskAi } from "../../context/AskAiContext"
import TravelChatPanel from "./TravelChatPanel"

export default function AskAiDialog() {
  const { open, seedMessage, tripContext, closeAskAi } = useAskAi()

  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e) => {
      if (e.key === "Escape") closeAskAi()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [open, closeAskAi])

  if (typeof document === "undefined") return null

  return createPortal(
    <div
      className={`fixed inset-0 z-[200] transition-opacity duration-300 ${
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        aria-label="Close assistant"
        onClick={closeAskAi}
      />

      {/* Slide-over panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ask-ai-title"
        className={`absolute top-0 right-0 h-full w-full max-w-md sm:max-w-lg bg-background shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Subtle gradient accent */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-primary/8 via-transparent to-transparent"
          aria-hidden
        />

        {/* Header */}
        <header className="shrink-0 flex items-center justify-between gap-3 px-5 py-4 border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
              <MessageCircle className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <h2 id="ask-ai-title" className="font-heading font-semibold text-base text-foreground truncate">
                Travel Copilot
              </h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-primary" />
                Powered by AI
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAskAi}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Chat body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 relative z-[1]">
          {open && (
            <TravelChatPanel
              key={`${seedMessage}-${tripContext?.itineraryId || "general"}`}
              variant="dialog"
              initialMessage={seedMessage}
              onClose={closeAskAi}
              itineraryId={tripContext?.itineraryId}
              itinerarySnapshot={tripContext?.snapshot}
              onItineraryUpdated={tripContext?.onRefresh}
              className="h-full"
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
