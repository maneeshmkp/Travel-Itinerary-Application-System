"use client"

/** CloudDeploymentSection — Render, Vercel, Atlas, S3 */
import { Server, Globe, Database, Cloud } from "lucide-react"
import { LandingSection, GlassCard } from "./LandingSection"
import { CLOUD_ITEMS } from "../../constants/landing"

const ICONS = { Server, Globe, Database, Cloud }

export default function CloudDeploymentSection() {
  return (
    <LandingSection
      id="cloud"
      eyebrow="Cloud"
      title="Deploy where you already ship"
      lead="API on Render, SPA on Vercel, data on Atlas, files on S3—documented end to end."
      className="bg-muted/20"
    >
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CLOUD_ITEMS.map((item) => {
          const Icon = ICONS[item.icon] || Cloud
          return (
            <li key={item.title}>
              <GlassCard className="h-full">
                <Icon className="mb-3 h-5 w-5 text-sky-600 dark:text-sky-400" aria-hidden />
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
