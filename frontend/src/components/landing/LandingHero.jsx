"use client"

/**
 * LandingHero — SaaS-first viewport: brand, one headline, support line, CTA group.
 * Full-bleed atmospheric background; no cards or stats in the hero.
 */
import { Link } from "react-router-dom"
import { ArrowRight, Github, Play } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import HeroBackground from "../home/HeroBackground"
import ThemeToggle from "./ThemeToggle"
import { DEMO_PATH, GITHUB_URL } from "../../constants/landing"

const GUARD_MESSAGE = "Please login to access this feature"

const guardLogin = (pathname, search = "") => ({
  pathname: "/login",
  state: { from: { pathname, search }, message: GUARD_MESSAGE },
})

export default function LandingHero() {
  const { isAuthenticated } = useAuth()
  const demoTo = isAuthenticated ? DEMO_PATH : guardLogin(DEMO_PATH)
  const startTo = isAuthenticated ? "/ai-itinerary" : guardLogin("/ai-itinerary")

  return (
    <section className="relative -mt-14 md:-mt-16 min-h-[100svh] overflow-hidden flex items-center">
      <HeroBackground />
      <div className="absolute right-4 top-20 z-20 md:right-8 md:top-24">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 text-center">
        <p className="landing-enter font-heading text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground mb-6">
          TravelPlan
        </p>
        <h1 className="landing-enter landing-enter-delay-1 type-display text-4xl sm:text-5xl lg:text-6xl leading-[1.08] mb-5">
          AI travel ops for modern teams
        </h1>
        <p className="landing-enter landing-enter-delay-2 type-lead mx-auto max-w-2xl mb-10">
          Plan itineraries, track spend and bookings, watch flights, and collaborate—backed by Redis, BullMQ, and
          enterprise security.
        </p>

        <div className="landing-enter landing-enter-delay-3 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <Link
            to={startTo}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Get started
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            to={demoTo}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/80 bg-white/50 px-7 py-3.5 text-sm font-semibold text-foreground backdrop-blur-md transition hover:bg-white/70 dark:bg-white/5 dark:hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Play className="h-4 w-4" aria-hidden />
            Live Demo
          </Link>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/80 bg-white/40 px-7 py-3.5 text-sm font-semibold text-foreground backdrop-blur-md transition hover:bg-white/60 dark:bg-white/5 dark:hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Github className="h-4 w-4" aria-hidden />
            GitHub
          </a>
        </div>
      </div>
    </section>
  )
}
