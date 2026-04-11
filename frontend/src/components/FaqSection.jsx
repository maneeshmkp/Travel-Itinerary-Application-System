"use client"

import { useState } from "react"
import { Plus, Minus } from "lucide-react"

const FAQ_ITEMS = [
  {
    q: "How do I plan a trip with TravelPlan?",
    a: "Create a free account, open Create Itinerary, and add your destination, nights, and days. Fill hotels and activities—or use AI to suggest activities and enrich descriptions. Save when you are happy; you can browse and refine later from your itineraries list.",
  },
  {
    q: "What makes TravelPlan itineraries practical?",
    a: "Each day keeps hotels, activities, times, and notes in one structured view. Highlights and tags help you scan the trip quickly, and AI assists with wording when you want inspiration—not a rigid template you cannot edit.",
  },
  {
    q: "Is someone there if something goes wrong while I travel?",
    a: "TravelPlan is a planning tool: it does not replace emergency services, airlines, or hotels. For account or technical issues, use the contact details in the site footer. Always keep local emergency numbers and your bookings handy while you are away.",
  },
  {
    q: "Do you help with visas, insurance, or flights?",
    a: "The app focuses on itinerary structure and copy. Visas, insurance, and ticketing rules change by country and carrier—you should confirm those with official sources or your travel agent. We do not process payments or bookings inside TravelPlan.",
  },
  {
    q: "Can I change or cancel plans after I save them?",
    a: "You can edit itineraries you have access to from the app. Cancellations for hotels or activities depend on the providers you booked with outside TravelPlan—your saved itinerary is your single source of truth for what you intended to do.",
  },
  {
    q: "I do not know where to go yet—can TravelPlan still help?",
    a: "Browse itineraries and recommendations to see destinations others have built. When you pick a place, start a draft with a few days and use AI suggest-day per day to seed ideas, then swap in your own picks as you research.",
  },
  {
    q: "Are there hidden charges?",
    a: "TravelPlan’s core planning features are described in your product or hosting terms—there are no surprise fees inside the itinerary editor itself. Third-party AI usage may depend on your API keys or provider limits if you connect your own keys on self-hosted setups.",
  },
]

function FaqSection() {
  const [open, setOpen] = useState(0)

  const toggle = (i) => {
    setOpen((prev) => (prev === i ? -1 : i))
  }

  return (
    <section className="bg-muted/20 py-20 md:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center md:mb-12">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mx-auto mt-3 max-w-3xl text-base text-muted-foreground sm:text-lg lg:text-xl">
            Planning made simpler—answers to common questions about how TravelPlan fits into your trip workflow.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card px-2 py-2 shadow-sm sm:px-4 md:px-8 lg:px-12">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = open === i
            return (
              <div key={item.q} className="px-3 sm:px-4 md:px-2">
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  className="flex w-full items-start justify-between gap-6 py-5 text-left transition hover:bg-muted/30 sm:gap-8 sm:py-6 md:py-6"
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${i}`}
                  id={`faq-trigger-${i}`}
                >
                  <span className="font-heading text-base font-semibold leading-snug text-foreground sm:text-lg md:text-xl">
                    {item.q}
                  </span>
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground">
                    {isOpen ? <Minus className="h-5 w-5" strokeWidth={2} aria-hidden /> : <Plus className="h-5 w-5" strokeWidth={2} aria-hidden />}
                  </span>
                </button>
                <div
                  id={`faq-panel-${i}`}
                  role="region"
                  aria-labelledby={`faq-trigger-${i}`}
                  className={`grid min-h-0 transition-[grid-template-rows] duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <p className="pb-6 pr-2 text-sm leading-relaxed text-muted-foreground sm:text-base sm:leading-relaxed md:max-w-4xl md:text-[17px]">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default FaqSection
