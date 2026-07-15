"use client"

/**
 * ScreenshotGallery — responsive lazy-loaded image gallery (decorative product shots).
 */
import { useState } from "react"
import { LandingSection, GlassCard } from "./LandingSection"
import { SCREENSHOTS } from "../../constants/landing"

export default function ScreenshotGallery() {
  const [active, setActive] = useState(SCREENSHOTS[0]?.id)

  const current = SCREENSHOTS.find((s) => s.id === active) || SCREENSHOTS[0]

  return (
    <LandingSection
      id="screens"
      eyebrow="Product tour"
      title="Built for the journey"
      lead="A responsive gallery of TravelPlan surfaces—optimized images, lazy-loaded by default."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <GlassCard className="overflow-hidden p-0">
          <figure>
            <img
              key={current.id}
              src={current.src}
              alt={current.alt}
              width={1200}
              height={750}
              loading="lazy"
              decoding="async"
              className="aspect-[16/10] w-full object-cover"
              sizes="(max-width: 1024px) 100vw, 70vw"
            />
            <figcaption className="border-t border-border/50 px-5 py-4">
              <p className="font-semibold text-foreground">{current.title}</p>
              <p className="text-sm text-muted-foreground">{current.caption}</p>
            </figcaption>
          </figure>
        </GlassCard>

        <ul className="flex gap-3 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible" aria-label="Gallery thumbnails">
          {SCREENSHOTS.map((shot) => {
            const selected = shot.id === active
            return (
              <li key={shot.id} className="shrink-0 lg:shrink">
                <button
                  type="button"
                  onClick={() => setActive(shot.id)}
                  aria-pressed={selected}
                  className={`w-40 overflow-hidden rounded-xl border text-left transition lg:w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    selected
                      ? "border-primary ring-1 ring-primary/40"
                      : "border-border/70 opacity-90 hover:opacity-100"
                  }`}
                >
                  <img
                    src={`${shot.src.replace("w=1200", "w=400")}`}
                    alt=""
                    width={400}
                    height={250}
                    loading="lazy"
                    decoding="async"
                    className="aspect-video w-full object-cover"
                  />
                  <span className="block truncate px-2 py-1.5 text-xs font-medium text-foreground">{shot.title}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </LandingSection>
  )
}
