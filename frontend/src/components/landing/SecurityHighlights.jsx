"use client"

/** SecurityHighlights — JWT, RBAC, rate limiting, Helmet */
import { Shield, KeyRound, Gauge, Lock } from "lucide-react"
import { LandingSection, GlassCard } from "./LandingSection"
import { SECURITY_ITEMS } from "../../constants/landing"

const ICONS = [KeyRound, Shield, Gauge, Lock]

export default function SecurityHighlights() {
  return (
    <LandingSection
      id="security"
      eyebrow="Security"
      title="Enterprise controls by default"
      lead="Sessions, roles, abuse protection, and hardened HTTP headers—not bolted on later."
    >
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SECURITY_ITEMS.map((item, i) => {
          const Icon = ICONS[i] || Shield
          return (
            <li key={item.title}>
              <GlassCard className="h-full text-center sm:text-left">
                <span className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 sm:mx-0">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </GlassCard>
            </li>
          )
        })}
      </ul>
    </LandingSection>
  )
}
