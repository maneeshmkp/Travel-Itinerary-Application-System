"use client"

import { MessageCircle, Sparkles, Loader2, Backpack, ShieldAlert, HelpCircle } from "lucide-react"
import PackingTripPanel from "../../packing/PackingTripPanel"
import RiskTripPanel from "../../risk/RiskTripPanel"
import CollapsibleSection from "../CollapsibleSection"

const SUGGESTED = [
  "Is my trip safe?",
  "What should I change?",
  "Can I reduce travel time?",
  "How can I save money on this trip?",
  "Summarize my whole trip.",
]

export default function AiTab({ ctx }) {
  const { itinerary, openAskAi, handleAiTripSummary, aiSummaryLoading, refreshItinerary } = ctx

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-semibold text-xl">AI Workspace</h2>
        <p className="text-sm text-muted-foreground">Every AI module in one place — copilot, packing, risk detection and summaries.</p>
      </div>

      {/* Copilot launcher */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-semibold">Trip Copilot</h3>
            <p className="text-sm text-muted-foreground">Ask anything about this trip — replanning, risks, budget, bookings.</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTED.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => openAskAi(q)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:border-primary/40 hover:text-primary transition-colors"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              {q}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openAskAi("")}
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-primary/90"
          >
            <MessageCircle className="h-4 w-4" />
            Open Copilot
          </button>
          <button
            type="button"
            onClick={handleAiTripSummary}
            disabled={aiSummaryLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 text-primary px-4 py-2.5 text-sm font-semibold hover:bg-primary/10 disabled:opacity-60"
          >
            {aiSummaryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            AI trip summary (copy)
          </button>
        </div>
      </div>

      <CollapsibleSection
        title="AI Packing Assistant"
        description="Auto-generated, weather-aware packing checklist."
        icon={Backpack}
        defaultOpen={false}
      >
        <div id="packing">
          <PackingTripPanel tripId={itinerary._id} tripTitle={itinerary.title} startDate={itinerary.startDate} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="AI Risk Detection & Replanning"
        description="Detects conflicts, weather and budget risks, and suggests fixes."
        icon={ShieldAlert}
        defaultOpen={false}
      >
        <div id="risks">
          <RiskTripPanel tripId={itinerary._id} tripTitle={itinerary.title} onItineraryRefresh={refreshItinerary} />
        </div>
      </CollapsibleSection>
    </div>
  )
}
