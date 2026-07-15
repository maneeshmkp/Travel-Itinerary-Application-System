"use client"

/**
 * ArchitecturePreview — lightweight HTML/CSS diagram (no app logic) linking to ARCHITECTURE.md on GitHub.
 */
import { ExternalLink } from "lucide-react"
import { LandingSection, GlassCard } from "./LandingSection"
import { GITHUB_URL } from "../../constants/landing"

const NODES = [
  { id: "spa", label: "React SPA", sub: "Vite · PWA", x: "8%", y: "28%" },
  { id: "api", label: "Express API", sub: "JWT · RBAC · Events", x: "38%", y: "28%" },
  { id: "mongo", label: "MongoDB", sub: "Atlas / local", x: "70%", y: "12%" },
  { id: "redis", label: "Redis", sub: "Cache · BullMQ · Socket", x: "70%", y: "48%" },
  { id: "s3", label: "AWS S3", sub: "Document vault", x: "70%", y: "78%" },
  { id: "ext", label: "AI · Maps · Weather", sub: "Providers", x: "38%", y: "72%" },
]

export default function ArchitecturePreview() {
  return (
    <LandingSection
      id="architecture"
      eyebrow="Architecture"
      title="Modular monolith that scales"
      lead="API, workers, and realtime share Redis—observe it all from the Admin monitoring console."
      className="bg-muted/20"
    >
      <GlassCard className="overflow-hidden p-0">
        <div className="relative min-h-[280px] md:min-h-[340px] bg-gradient-to-br from-slate-50 via-teal-50/40 to-sky-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 md:p-8">
          <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-40" aria-hidden>
            <line x1="22%" y1="36%" x2="42%" y2="36%" stroke="currentColor" className="text-primary" strokeWidth="2" />
            <line x1="55%" y1="30%" x2="70%" y2="20%" stroke="currentColor" className="text-primary" strokeWidth="2" />
            <line x1="55%" y1="38%" x2="70%" y2="55%" stroke="currentColor" className="text-primary" strokeWidth="2" />
            <line x1="48%" y1="45%" x2="48%" y2="70%" stroke="currentColor" className="text-primary" strokeWidth="2" />
            <line x1="55%" y1="78%" x2="70%" y2="82%" stroke="currentColor" className="text-primary" strokeWidth="2" />
          </svg>
          {NODES.map((n) => (
            <div
              key={n.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/50 bg-white/80 px-3 py-2 text-left shadow-md backdrop-blur-md dark:border-white/10 dark:bg-slate-900/80"
              style={{ left: n.x, top: n.y }}
            >
              <p className="text-xs font-semibold text-foreground md:text-sm">{n.label}</p>
              <p className="text-[10px] text-muted-foreground md:text-xs">{n.sub}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-5 py-4">
          <p className="text-sm text-muted-foreground">Preview only—full Mermaid diagrams live in the repo.</p>
          <a
            href={`${GITHUB_URL}/blob/main/ARCHITECTURE.md`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            Open ARCHITECTURE.md
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
      </GlassCard>
    </LandingSection>
  )
}
