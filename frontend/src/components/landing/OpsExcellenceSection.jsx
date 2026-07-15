"use client"

/** OpsExcellenceSection — Redis, Docker, CI/CD, Playwright, Monitoring, S3 */
import { Database, Container, GitBranch, TestTube2, Activity, HardDrive } from "lucide-react"
import { LandingSection, GlassCard } from "./LandingSection"
import { OPS_PILLARS } from "../../constants/landing"

const ICONS = { Database, Container, GitBranch, TestTube2, Activity, HardDrive }

export default function OpsExcellenceSection() {
  return (
    <LandingSection
      id="performance"
      eyebrow="Operations"
      title="Built for reliability"
      lead="Caching, containers, pipelines, E2E tests, observability, and durable file storage."
      className="bg-muted/20"
    >
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {OPS_PILLARS.map((item) => {
          const Icon = ICONS[item.icon] || Activity
          return (
            <li key={item.title}>
              <GlassCard className="h-full">
                <Icon className="mb-3 h-5 w-5 text-primary" aria-hidden />
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
