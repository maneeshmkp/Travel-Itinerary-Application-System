"use client"

/**
 * DocumentationLinks — GitHub + live API docs (Swagger / OpenAPI / health).
 * API-relative links use VITE_API_URL origin in production.
 */
import { BookOpen, ExternalLink } from "lucide-react"
import { LandingSection, GlassCard } from "./LandingSection"
import { DOC_LINKS } from "../../constants/landing"

function apiOrigin() {
  return (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "")
}

function resolveDocHref(doc) {
  if (!doc.apiRelative) return doc.href
  const path = doc.href.startsWith("/") ? doc.href : `/${doc.href}`
  return `${apiOrigin()}${path}`
}

export default function DocumentationLinks() {
  return (
    <LandingSection
      id="docs"
      eyebrow="Documentation"
      title="Read the system, not just the pitch"
      lead="Live OpenAPI explorers and health probes — kept in sync with the running API."
    >
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DOC_LINKS.map((doc) => {
          const href = resolveDocHref(doc)
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
