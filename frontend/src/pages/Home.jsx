"use client"

/**
 * Product landing page (`/`).
 * Composes marketing sections; keeps destination discovery for social proof.
 * Business/API logic for destinations is unchanged.
 */
import { lazy, Suspense, useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { MapPin, Plus, Star, ArrowRight } from "lucide-react"
import { recommendationAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"
import LoadingSpinner from "../components/LoadingSpinner"
import ErrorMessage from "../components/ErrorMessage"
import DestinationHeroImage from "../components/DestinationHeroImage"
import { SeoHead, LandingHero } from "../components/landing"

const FeatureShowcase = lazy(() => import("../components/landing/FeatureShowcase"))
const TechStackSection = lazy(() => import("../components/landing/TechStackSection"))
const ArchitecturePreview = lazy(() => import("../components/landing/ArchitecturePreview"))
const ScreenshotGallery = lazy(() => import("../components/landing/ScreenshotGallery"))
const OpsExcellenceSection = lazy(() => import("../components/landing/OpsExcellenceSection"))
const SecurityHighlights = lazy(() => import("../components/landing/SecurityHighlights"))
const CloudDeploymentSection = lazy(() => import("../components/landing/CloudDeploymentSection"))
const DocumentationLinks = lazy(() => import("../components/landing/DocumentationLinks"))
const HowItWorksSection = lazy(() => import("../components/home/HowItWorksSection"))
const MemoriesMadeSection = lazy(() => import("../components/MemoriesMadeSection"))
const TestimonialsSection = lazy(() => import("../components/TestimonialsSection"))
const FaqSection = lazy(() => import("../components/FaqSection"))

const GUARD_MESSAGE = "Please login to access this feature"

const guardLogin = (pathname, search = "") => ({
  pathname: "/login",
  state: {
    from: { pathname, search },
    message: GUARD_MESSAGE,
  },
})

function SectionFallback() {
  return (
    <div className="flex justify-center py-16 text-sm text-muted-foreground" aria-hidden>
      Loading…
    </div>
  )
}

const Home = () => {
  const { isAuthenticated } = useAuth()
  const [destinations, setDestinations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDestinations = async () => {
    try {
      setError(null)
      const response = await recommendationAPI.getDestinations()
      setDestinations(response.data.data.slice(0, 6))
    } catch (err) {
      console.error("Error fetching destinations:", err)
      setError("Failed to load destinations. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDestinations()
  }, [])

  return (
    <div className="min-h-screen">
      <SeoHead />
      <LandingHero />

      <Suspense fallback={<SectionFallback />}>
        <FeatureShowcase />
        <TechStackSection />
        <ArchitecturePreview />
        <ScreenshotGallery />
        <OpsExcellenceSection />
        <SecurityHighlights />
        <CloudDeploymentSection />
        <DocumentationLinks />
        <HowItWorksSection />
        <MemoriesMadeSection />
      </Suspense>

      <section className="relative py-24 md:py-32 overflow-hidden isolate">
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1600&q=72"
            alt=""
            width={1600}
            height={900}
            className="h-full w-full min-h-full object-cover object-center"
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            sizes="100vw"
          />
        </div>
        <div
          aria-hidden
          className="absolute inset-0 z-[1] bg-gradient-to-b from-background/88 via-background/82 to-background/90"
        />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 md:mb-20">
            <h2 className="type-section-title mb-4">Popular Destinations</h2>
            <p className="type-lead max-w-2xl mx-auto">
              Explore our most loved travel destinations with ready-made itineraries
            </p>
          </div>

          {loading ? (
            <LoadingSpinner size="lg" text="Loading destinations..." />
          ) : error ? (
            <ErrorMessage title="Failed to load destinations" message={error} onRetry={fetchDestinations} />
          ) : destinations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {destinations.map((destination, index) => (
                <div
                  key={index}
                  className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-all duration-300 animate-slide-up group"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <DestinationHeroImage
                    destination={destination.destination}
                    title={destination.title || destination.destination}
                    tags={destination.tags ?? []}
                    coverImage={destination.coverImage}
                    heightClass="h-44"
                    roundedClass="rounded-t-lg"
                    badge={
                      <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold shadow-md">
                        <Star className="h-3.5 w-3.5" />
                        <span>{destination.itineraryCount}</span>
                      </div>
                    }
                  />

                  <div className="p-6">
                    <h3 className="font-body font-semibold text-xl text-card-foreground mb-4">
                      {destination.destination}
                    </h3>
                    <div className="mb-4">
                      <p className="type-body text-sm mb-2">
                        {destination.nightRange.min} - {destination.nightRange.max} nights available
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {(destination.tags ?? []).slice(0, 3).map((tag, tagIndex) => (
                          <span
                            key={tagIndex}
                            className="px-2 py-1 bg-secondary/10 text-secondary text-xs rounded-full border border-secondary/20"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Link
                      to={
                        isAuthenticated
                          ? `/recommendations?destination=${encodeURIComponent(destination.destination)}`
                          : guardLogin(
                              "/recommendations",
                              `?destination=${encodeURIComponent(destination.destination)}`,
                            )
                      }
                      className="text-primary hover:text-primary/80 font-medium text-sm flex items-center group"
                    >
                      View Itineraries
                      <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="type-body">No destinations available yet.</p>
            </div>
          )}

          <div className="text-center mt-12">
            <Link
              to={isAuthenticated ? "/recommendations" : guardLogin("/recommendations")}
              className="button-primary text-base px-8 py-3"
            >
              View All Destinations
              <ArrowRight className="h-5 w-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      <Suspense fallback={<SectionFallback />}>
        <TestimonialsSection />
        <FaqSection />
      </Suspense>

      <section className="relative py-24 md:py-32 overflow-hidden min-h-[22rem] md:min-h-[26rem] flex items-center isolate">
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1600&q=72"
            alt=""
            width={1600}
            height={900}
            className="h-full w-full object-cover object-center"
            loading="lazy"
            decoding="async"
            sizes="100vw"
          />
        </div>
        <div aria-hidden className="absolute inset-0 z-[1] bg-black/60" />
        <div
          aria-hidden
          className="absolute inset-0 z-[2] bg-gradient-to-r from-primary/88 via-primary/82 to-primary/78"
        />
        <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="type-section-title mb-5 text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.85),0_4px_24px_rgba(0,0,0,0.65)]">
            Ready to Start Planning?
          </h2>
          <p className="type-lead mb-10 text-white max-w-2xl mx-auto [text-shadow:0_1px_3px_rgba(0,0,0,0.9),0_3px_18px_rgba(0,0,0,0.7)]">
            Join travelers who trust TravelPlan for AI planning, bookings, and operations in one place.
          </p>
          <Link
            to={isAuthenticated ? "/create" : guardLogin("/create")}
            className="bg-primary-foreground text-primary hover:bg-primary-foreground/95 px-8 py-3 rounded-lg font-semibold transition-all duration-200 inline-flex items-center shadow-lg hover:shadow-xl"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Your First Itinerary
          </Link>
        </div>
      </section>
    </div>
  )
}

export default Home
