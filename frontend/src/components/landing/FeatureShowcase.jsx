"use client"

/**
 * FeatureShowcase — grid of product capabilities with glass cards + lazy icons.
 */
import { Link } from "react-router-dom"
import {
  Sparkles,
  Bot,
  Wallet,
  Ticket,
  Plane,
  Map,
  CloudSun,
  FileLock2,
  Bell,
  BarChart3,
  ArrowUpRight,
} from "lucide-react"
import { LandingSection, GlassCard } from "./LandingSection"
import { LANDING_FEATURES } from "../../constants/landing"
import { useAuth } from "../../context/AuthContext"

const ICONS = {
  Sparkles,
  Bot,
  Wallet,
  Ticket,
  Plane,
  Map,
  CloudSun,
  FileLock2,
  Bell,
  BarChart3,
}

const GUARD_MESSAGE = "Please login to access this feature"
const guardLogin = (pathname) => ({
  pathname: "/login",
  state: { from: { pathname }, message: GUARD_MESSAGE },
})

export default function FeatureShowcase() {
  const { isAuthenticated } = useAuth()

  return (
    <LandingSection
      id="features"
      eyebrow="Product"
      title="Everything to run a trip"
      lead="From first sketch to live flight updates—features that ship in a single MERN platform."
      className="bg-muted/20"
    >
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {LANDING_FEATURES.map((f, i) => {
          const Icon = ICONS[f.icon] || Sparkles
          const to = isAuthenticated ? f.to : guardLogin(f.to)
          return (
            <li key={f.id} className="landing-rise" style={{ animationDelay: `${i * 0.04}s` }}>
              <Link to={to} className="group block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl">
                <GlassCard className="h-full transition duration-300 group-hover:-translate-y-1 group-hover:border-primary/30">
                  <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="flex items-center gap-1 font-semibold text-foreground">
                    {f.title}
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" aria-hidden />
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.description}</p>
                </GlassCard>
              </Link>
            </li>
          )
        })}
      </ul>
    </LandingSection>
  )
}
