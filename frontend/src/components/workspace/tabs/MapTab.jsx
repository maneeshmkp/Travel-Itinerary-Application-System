"use client"

import { Compass } from "lucide-react"
import ItineraryMap from "../../ItineraryMap"
import NearbyRecommendations from "../../nearby/NearbyRecommendations"
import CollapsibleSection from "../CollapsibleSection"

export default function MapTab({ ctx }) {
  const { itinerary, lookupByActivity, mapFocus } = ctx

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-semibold text-xl">Maps & nearby</h2>
        <p className="text-sm text-muted-foreground">Routes, walking time and nearby restaurants, hospitals, ATMs and attractions.</p>
      </div>

      <div id="trip-map" className="bg-card border border-border/60 rounded-xl p-4 sm:p-5 shadow-sm">
        <ItineraryMap
          days={itinerary.days}
          destination={itinerary.destination}
          lookupByActivity={lookupByActivity}
          mapFocus={mapFocus}
        />
      </div>

      <CollapsibleSection
        title="Nearby recommendations"
        description="Discover places around your stops."
        icon={Compass}
        defaultOpen
      >
        <div id="nearby">
          <NearbyRecommendations
            itineraryId={itinerary._id}
            tripDestination={itinerary.destination}
            tripTitle={itinerary.title}
          />
        </div>
      </CollapsibleSection>
    </div>
  )
}
