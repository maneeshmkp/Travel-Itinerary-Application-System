"use client"

import { Link } from "react-router-dom"
import { MapPin, Loader2, Tag, Star, BarChart3, ArrowUpRight } from "lucide-react"
import ItineraryReviews from "../../ItineraryReviews"
import DestinationHeroImage from "../../DestinationHeroImage"
import CollapsibleSection from "../CollapsibleSection"

export default function InsightsTab({ ctx }) {
  const { id, itinerary, similarItineraries, similarLoading, isAuthenticated } = ctx

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-semibold text-xl">Insights</h2>
        <p className="text-sm text-muted-foreground">Highlights, reviews, ratings and analytics for this trip.</p>
      </div>

      {/* Travel analytics cross-link */}
      <Link
        to="/analytics"
        className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 p-4 hover:border-primary/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">Personal Travel Analytics</p>
            <p className="text-xs text-muted-foreground">Travel score, achievements, heatmap and AI recommendations.</p>
          </div>
        </div>
        <ArrowUpRight className="h-4 w-4 text-primary" />
      </Link>

      {/* Highlights */}
      {itinerary.highlights && itinerary.highlights.length > 0 ? (
        <div id="highlights" className="bg-card border border-border/60 rounded-xl p-5 shadow-sm">
          <h3 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
            <Star className="h-4 w-4 text-secondary" />
            Highlights
          </h3>
          <ul className="space-y-2">
            {itinerary.highlights.map((highlight, index) => (
              <li key={index} className="flex items-start">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0" />
                <span className="text-card-foreground">{highlight}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Tags */}
      {itinerary.tags && itinerary.tags.length > 0 ? (
        <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm">
          <h3 className="font-heading font-semibold text-lg mb-4">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {itinerary.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-secondary/10 text-secondary border border-secondary/20"
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Reviews */}
      <CollapsibleSection title="Reviews & ratings" icon={Star} defaultOpen={false} allowFullscreen={false}>
        <div id="reviews">
          <ItineraryReviews itineraryId={id} isAuthenticated={isAuthenticated} />
        </div>
      </CollapsibleSection>

      {/* Similar trips */}
      <div id="similar" className="bg-card border border-border/60 rounded-xl p-5 shadow-sm">
        <h3 className="font-heading font-semibold text-lg mb-4">Similar itineraries</h3>
        {similarLoading ? (
          <div className="text-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading suggestions…</p>
          </div>
        ) : similarItineraries.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {similarItineraries.slice(0, 6).map((similar) => (
              <Link
                key={similar._id}
                to={`/itineraries/${similar._id}`}
                className="block border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow group"
              >
                <DestinationHeroImage
                  itinerary={similar}
                  destination={similar.destination}
                  title={similar.title}
                  tags={similar.tags}
                  coverImage={similar.coverImage}
                  heightClass="h-28"
                  roundedClass="rounded-t-xl"
                  badge={
                    <span className="absolute top-2 right-2 rounded-full bg-primary text-primary-foreground text-[10px] px-2 py-0.5 font-semibold shadow">
                      {similar.numberOfNights} nights
                    </span>
                  }
                />
                <div className="p-3">
                  <h4 className="font-medium text-card-foreground mb-1 line-clamp-2">{similar.title}</h4>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3 mr-1 shrink-0" />
                    <span className="truncate">{similar.destination}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No similar itineraries found.</p>
        )}
      </div>
    </div>
  )
}
