"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { MapPin, Plus, Compass, Star, ArrowRight, Calendar, Users, Globe, Search } from "lucide-react"
import { recommendationAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"
import LoadingSpinner from "../components/LoadingSpinner"
import ErrorMessage from "../components/ErrorMessage"
import DestinationHeroImage from "../components/DestinationHeroImage"

const GUARD_MESSAGE = "Please login to access this feature"

const guardLogin = (pathname, search = "") => ({
  pathname: "/login",
  state: {
    from: { pathname, search },
    message: GUARD_MESSAGE,
  },
})

const Home = () => {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [heroQuery, setHeroQuery] = useState("")
  const [destinations, setDestinations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const submitHeroSearch = (e) => {
    e?.preventDefault()
    const q = heroQuery.trim()
    if (!q) return
    navigate(`/itineraries?search=${encodeURIComponent(q)}`)
  }

  const fetchDestinations = async () => {
    try {
      setError(null)
      const response = await recommendationAPI.getDestinations()
      setDestinations(response.data.data.slice(0, 6))
    } catch (error) {
      console.error("Error fetching destinations:", error)
      setError("Failed to load destinations. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDestinations()
  }, [])

  const features = [
    {
      icon: Calendar,
      title: "Smart Planning",
      description: "Create detailed day-by-day itineraries with activities, hotels, and transfers.",
      image:
        "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=80",
    },
    {
      icon: Compass,
      title: "Expert Recommendations",
      description: "Get curated suggestions based on your preferences and travel style.",
      image:
        "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80",
    },
    {
      icon: Users,
      title: "Community Driven",
      description: "Browse and share itineraries created by fellow travelers.",
      image:
        "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80",
    },
    {
      icon: Globe,
      title: "Global Destinations",
      description: "Discover amazing places from tropical beaches to cultural cities.",
      image:
        "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80",
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section — travel photo + overlay (matches bottom CTA treatment) */}
      <section className="relative py-24 md:py-32 overflow-hidden min-h-[28rem] md:min-h-[34rem] flex items-center">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1920&q=80')",
          }}
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/45" />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-primary/88 via-primary/76 to-primary/84"
        />
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="font-heading font-bold text-5xl md:text-7xl text-white mb-6 leading-tight [text-shadow:0_2px_24px_rgba(0,0,0,0.55),0_1px_4px_rgba(0,0,0,0.8)]">
              Plan Your Perfect
              <span className="text-white block mt-2">Travel Adventure</span>
            </h1>
            {/* Use divs — global `p { color: muted }` in index.css overrides Tailwind on <p> */}
            <div className="text-lg md:text-xl text-white mb-6 max-w-3xl mx-auto leading-relaxed font-medium [text-shadow:0_2px_14px_rgba(0,0,0,0.75),0_1px_3px_rgba(0,0,0,0.9)]">
              Create detailed itineraries, discover amazing destinations, and turn your travel dreams into reality. From
              tropical getaways to cultural explorations, we&apos;ve got you covered.
            </div>
            <div className="text-base md:text-lg text-white/95 mb-8 max-w-2xl mx-auto font-medium [text-shadow:0_2px_12px_rgba(0,0,0,0.7),0_1px_3px_rgba(0,0,0,0.85)]">
              Join thousands of travelers who trust TravelPlan for their adventures
            </div>

            <form
              onSubmit={submitHeroSearch}
              className="max-w-xl mx-auto mb-10 flex flex-col sm:flex-row gap-0 items-stretch form-search-shell rounded-xl shadow-lg ring-2 ring-white/40"
            >
              <div className="flex flex-1 items-center gap-2 pl-4 min-w-0">
                <Search className="h-5 w-5 text-gray-400 shrink-0" />
                <input
                  type="search"
                  value={heroQuery}
                  onChange={(e) => setHeroQuery(e.target.value)}
                  placeholder="Search destinations, trips, beaches, hotels…"
                  className="form-search-input py-3.5 text-base"
                  aria-label="Search itineraries"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3.5 bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors sm:px-8"
              >
                Search
              </button>
            </form>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to={isAuthenticated ? "/create" : guardLogin("/create")}
                className="button-primary shadow-md hover:shadow-lg group"
              >
                <Plus className="h-5 w-5" />
                <span>Create Itinerary</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to={isAuthenticated ? "/recommendations" : guardLogin("/recommendations")}
                className="button-secondary shadow-md hover:shadow-lg"
              >
                <Compass className="h-5 w-5" />
                <span>Get Recommendations</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section — travel backdrop + light scrim (cards stay itinerary-style) */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1526772662000-3f88f104f96d?auto=format&fit=crop&w=1920&q=80')",
          }}
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-background/78 via-card/72 to-muted/85" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 md:mb-20">
            <h2 className="font-heading font-bold text-4xl md:text-5xl text-foreground mb-4 drop-shadow-sm [text-shadow:0_1px_2px_rgba(255,255,255,0.9)]">
              Why Choose TravelPlan?
            </h2>
            <div className="text-lg md:text-xl text-foreground/90 max-w-2xl mx-auto font-medium [text-shadow:0_1px_2px_rgba(255,255,255,0.85)]">
              Everything you need to plan, organize, and enjoy your perfect trip
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={index}
                  className="card-hover flex flex-col rounded-xl border border-border shadow-md overflow-hidden bg-card h-full group"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div
                    aria-hidden
                    className="relative h-40 shrink-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url('${feature.image}')` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-card from-25% via-card/20 to-transparent" />
                  </div>
                  <div className="text-center p-6 pt-5 flex-1 flex flex-col">
                    <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-card shadow-sm">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-heading font-semibold text-lg text-foreground mb-3">{feature.title}</h3>
                    <div className="text-muted-foreground text-sm leading-relaxed flex-1">{feature.description}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Popular Destinations — full-bleed photo (img + object-cover avoids blurry CSS-bg upscaling) */}
      <section className="relative py-24 md:py-32 overflow-hidden isolate">
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=3840&q=90"
            alt=""
            width={3840}
            height={2160}
            className="h-full w-full min-h-full object-cover object-center"
            loading="lazy"
            decoding="async"
            fetchPriority="low"
          />
        </div>
        <div
          aria-hidden
          className="absolute inset-0 z-[1] bg-gradient-to-b from-background/88 via-background/82 to-background/90"
        />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 md:mb-20">
            <h2 className="font-heading font-bold text-4xl md:text-5xl text-foreground mb-4 drop-shadow-sm">
              Popular Destinations
            </h2>
            <div className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
              Explore our most loved travel destinations with ready-made itineraries
            </div>
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
                  <h3 className="font-heading font-semibold text-xl text-card-foreground mb-4">
                    {destination.destination}
                  </h3>

                  <div className="mb-4">
                    <p className="text-muted-foreground text-sm mb-2">
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
              <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No destinations available yet.</p>
            </div>
          )}

          <div className="text-center mt-12">
            <Link
              to={isAuthenticated ? "/itineraries" : guardLogin("/itineraries")}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 rounded-lg font-medium transition-colors inline-flex items-center shadow-md"
            >
              Browse All Itineraries
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section — photo + dark scrim + primary tint (map photo is very light; white text needs contrast) */}
      <section className="relative py-24 md:py-32 overflow-hidden min-h-[22rem] md:min-h-[26rem] flex items-center isolate">
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=3840&q=90"
            alt=""
            width={3840}
            height={2160}
            className="h-full w-full object-cover object-center"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div aria-hidden className="absolute inset-0 z-[1] bg-black/60" />
        <div
          aria-hidden
          className="absolute inset-0 z-[2] bg-gradient-to-r from-primary/88 via-primary/82 to-primary/78"
        />
        <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading font-bold text-4xl md:text-5xl mb-5 text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.85),0_4px_24px_rgba(0,0,0,0.65)]">
            Ready to Start Planning?
          </h2>
          <div className="text-lg md:text-xl mb-10 text-white font-medium max-w-2xl mx-auto leading-relaxed [text-shadow:0_1px_3px_rgba(0,0,0,0.9),0_3px_18px_rgba(0,0,0,0.7)]">
            Join thousands of travelers who trust TravelPlan for their adventures
          </div>
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
