"use client"

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Search, Sparkles, ArrowRight, MapPin, Star } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import HeroBackground from "./HeroBackground"

const GUARD_MESSAGE = "Please login to access this feature"

const guardLogin = (pathname, search = "") => ({
  pathname: "/login",
  state: { from: { pathname, search }, message: GUARD_MESSAGE },
})

const FLOATING_DESTINATIONS = [
  { place: "Goa", nights: "5 nights", rating: "4.8" },
  { place: "Manali", nights: "4 nights", rating: "4.9" },
  { place: "Jaipur", nights: "3 nights", rating: "4.7" },
]

function FloatingCard({ place, nights, rating, className = "", style }) {
  return (
    <div
      style={style}
      className={`rounded-2xl border border-white/80 bg-white/95 backdrop-blur-md px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-card/90 ${className}`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MapPin className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{place}</p>
          <p className="text-xs text-muted-foreground">{nights}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
        {rating}
      </div>
    </div>
  )
}

export default function HomeHero() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState("")

  const submitSearch = (e) => {
    e?.preventDefault()
    const q = query.trim()
    if (!q) return
    if (!isAuthenticated) {
      navigate(guardLogin("/itineraries", `?search=${encodeURIComponent(q)}`))
      return
    }
    navigate(`/itineraries?search=${encodeURIComponent(q)}`)
  }

  return (
    <section className="relative -mt-14 md:-mt-16 overflow-hidden min-h-[100svh] flex items-center">
      <HeroBackground />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 md:pt-28 md:pb-20">
        <div className="grid lg:grid-cols-[1fr_0.9fr] gap-10 lg:gap-12 items-center">
          <div className="text-center lg:text-left">
            <p
              className="hero-enter-fade type-eyebrow inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/60 backdrop-blur-sm px-3 py-1 mb-5 dark:border-white/15 dark:bg-card/50"
              style={{ animationDelay: "0.05s" }}
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              AI-powered travel planning
            </p>

            <h1
              className="hero-enter-fade type-display text-5xl sm:text-6xl lg:text-[4.25rem] leading-[1.05] mb-5"
              style={{ animationDelay: "0.12s" }}
            >
              Travel better.
              <span className="block mt-1 text-foreground">Plan your way.</span>
            </h1>

            <p
              className="hero-enter-fade type-lead max-w-lg mx-auto lg:mx-0 mb-8"
              style={{ animationDelay: "0.2s" }}
            >
              TravelPlan brings destinations to you and helps you build calm, day-by-day itineraries — your way.
            </p>

            <div className="hero-enter-slide max-w-lg mx-auto lg:mx-0" style={{ animationDelay: "0.28s" }}>
              <form
                onSubmit={submitSearch}
                className="ui-pill-field ui-pill-field-hero p-1.5"
                role="search"
              >
                <div className="flex flex-1 items-center gap-2 pl-3 min-w-0">
                  <Search className="h-4 w-4 ui-pill-icon shrink-0" aria-hidden />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Where do you want to go?"
                    className="ui-pill-input py-2"
                    aria-label="Search destinations and itineraries"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 shrink-0 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
                >
                  Search
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>

            <p
              className="hero-enter-fade mt-5 text-sm text-muted-foreground"
              style={{ animationDelay: "0.36s" }}
            >
              {isAuthenticated ? (
                <>
                  <Link to="/ai-itinerary" className="type-link">
                    Plan with AI
                  </Link>
                  <span className="mx-2 text-border">·</span>
                  <Link to="/itineraries" className="type-link">
                    Browse trips
                  </Link>
                </>
              ) : (
                <>
                  <Link to={guardLogin("/ai-itinerary")} className="type-link">
                    Plan with AI
                  </Link>
                  <span className="mx-2 text-border">·</span>
                  <Link to={guardLogin("/itineraries")} className="type-link">
                    Browse trips
                  </Link>
                </>
              )}
            </p>
          </div>

          <div className="relative hidden lg:block h-[26rem] xl:h-[30rem]">
            <div className="hero-enter-fade absolute inset-0 rounded-[2rem] border border-white/30 bg-white/10 backdrop-blur-[2px] dark:border-white/5" style={{ animationDelay: "0.15s" }} />

            <FloatingCard
              {...FLOATING_DESTINATIONS[0]}
              className="hero-enter-slide absolute top-[12%] right-[8%] w-44"
              style={{ animationDelay: "0.35s" }}
            />
            <FloatingCard
              {...FLOATING_DESTINATIONS[1]}
              className="hero-enter-slide absolute top-[42%] left-[4%] w-40"
              style={{ animationDelay: "0.45s" }}
            />
            <FloatingCard
              {...FLOATING_DESTINATIONS[2]}
              className="hero-enter-slide absolute bottom-[10%] right-[20%] w-44"
              style={{ animationDelay: "0.55s" }}
            />

            <div className="absolute bottom-[18%] left-[28%] text-4xl opacity-90 select-none" aria-hidden>
              🗼
            </div>
            <div className="absolute top-[22%] left-[38%] text-3xl opacity-80 select-none" aria-hidden>
              🏛️
            </div>
            <div className="absolute bottom-[32%] right-[6%] text-3xl opacity-85 select-none" aria-hidden>
              🌴
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
