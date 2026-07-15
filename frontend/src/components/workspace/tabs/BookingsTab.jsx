"use client"

import { CalendarCheck } from "lucide-react"
import BookingTracker from "../../bookings/BookingTracker"
import CalendarTripPanel from "../../calendar/CalendarTripPanel"
import CollapsibleSection from "../CollapsibleSection"
import { DEFAULT_CURRENCY } from "../../../utils/budgetCalculations"

export default function BookingsTab({ ctx }) {
  const { itinerary } = ctx
  const currency = itinerary.budget?.currency || itinerary.budgetInsight?.currency || DEFAULT_CURRENCY

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-semibold text-xl">Bookings</h2>
        <p className="text-sm text-muted-foreground">Hotels, restaurants, flights, trains and buses — status, timeline and analytics.</p>
      </div>

      <div id="bookings" className="bg-card border border-border/60 rounded-xl p-4 sm:p-5 shadow-sm">
        <BookingTracker tripId={itinerary._id} tripTitle={itinerary.title} defaultCurrency={currency} />
      </div>

      <CollapsibleSection
        title="Booking calendar & sync"
        description="Sync confirmed bookings and activities to your calendar."
        icon={CalendarCheck}
        defaultOpen={false}
      >
        <div id="calendar">
          <CalendarTripPanel tripId={itinerary._id} tripTitle={itinerary.title} />
        </div>
      </CollapsibleSection>
    </div>
  )
}
