"use client"

import { Plane, Radar } from "lucide-react"
import TripAvailability from "../../availability/TripAvailability"
import FlightDashboard from "../../flights/FlightDashboard"
import CollapsibleSection from "../CollapsibleSection"

export default function TransportTab({ ctx }) {
  const {
    itinerary,
    availabilityLoading,
    availabilityError,
    availabilityWarning,
    availabilityHotels,
    availabilityFlights,
    availabilityTrains,
    availabilityBuses,
    availabilityActivities,
    availabilityIsReal,
    availabilitySource,
  } = ctx

  return (
    <div className="space-y-6" id="transport">
      <div>
        <h2 className="font-heading font-semibold text-xl">Transport</h2>
        <p className="text-sm text-muted-foreground">Flights, trains, buses, live tracking and airport info in one place.</p>
      </div>

      <CollapsibleSection
        title="Flights, trains & bus options"
        description="Live availability and pricing for your route."
        icon={Plane}
        defaultOpen
      >
        <div id="availability">
          <TripAvailability
            loading={availabilityLoading}
            error={availabilityError}
            warning={availabilityWarning}
            hotels={availabilityHotels}
            flights={availabilityFlights}
            trains={availabilityTrains}
            buses={availabilityBuses}
            activities={availabilityActivities}
            isRealData={availabilityIsReal}
            dataSource={availabilitySource}
            destination={itinerary?.destination}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Live flight tracking & airport info"
        description="Real-time status, gates, baggage and boarding timeline."
        icon={Radar}
        defaultOpen={false}
      >
        <div id="flights">
          <FlightDashboard tripId={itinerary._id} tripTitle={itinerary.title} />
        </div>
      </CollapsibleSection>
    </div>
  )
}
