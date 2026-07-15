"use client"

/** TechStackSection — technology chips with accessible color accents */
import { LandingSection, GlassCard } from "./LandingSection"
import { TECH_STACK } from "../../constants/landing"

export default function TechStackSection() {
  return (
    <LandingSection
      id="stack"
      eyebrow="Technology"
      title="Production stack, not a toy demo"
      lead="MERN plus Redis, BullMQ, Socket.IO, S3, OpenAPI, Playwright, and CI/CD."
    >
      <GlassCard className="p-6 md:p-8">
        <ul className="flex flex-wrap justify-center gap-2.5 md:gap-3" aria-label="Technology stack">
          {TECH_STACK.map((t) => (
            <li key={t.name}>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3.5 py-2 text-sm font-medium text-foreground shadow-sm dark:bg-slate-950/40">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: t.color }}
                  aria-hidden
                />
                {t.name}
              </span>
            </li>
          ))}
        </ul>
      </GlassCard>
    </LandingSection>
  )
}
