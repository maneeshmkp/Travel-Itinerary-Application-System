"use client"

/**
 * DocumentationLinks — README, Swagger, Engineering Handbook, Architecture, Testing.
 * Swagger uses API origin derived from VITE_API_URL.
 */
import { BookOpen, ExternalLink } from "lucide-react"
import { LandingSection, GlassCard } from "./LandingSection"
import { DOC_LINKS } from "../../constants/landing"

function swaggerHref() {
  const base = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "")
  return `${base}/docs`
}

export default function DocumentationLinks() {
  return (
    <LandingSection
      id="docs"
      eyebrow="Documentation"
      title="Read the system, not just the pitch"
      lead="Handbook, OpenAPI, architecture, and security guides for humans and machines."
    >
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DOC_LINKS.map((doc) => {
          const href = doc.apiRelative ? swaggerHref() : doc.href
          return (
            <li key={doc.title}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group block h-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <GlassCard className="h-full transition group-hover:border-primary/30">
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <BookOpen className="h-4 w-4" aria-hidden />
                    </span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground opacity-60 group-hover:opacity-100" aria-hidden />
                  </div>
                  <h3 className="mt-3 font-semibold text-foreground">{doc.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{doc.description}</p>
                </GlassCard>
              </a>
            </li>
          )
        })}
      </ul>
    </LandingSection>
  )
}
