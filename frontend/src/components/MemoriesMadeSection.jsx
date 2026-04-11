"use client"

import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowUpRight } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { DESTINATION_IMAGE_FALLBACK } from "../utils/destinationImage"

const GUARD_MESSAGE = "Please login to access this feature"

const guardLogin = (pathname, search = "") => ({
  pathname: "/login",
  state: {
    from: { pathname, search },
    message: GUARD_MESSAGE,
  },
})

const u = (photoPath) =>
  `https://images.unsplash.com/${photoPath}?auto=format&fit=crop&w=1800&q=90`

const MEMORIES = [
  {
    tag: "Mountain pass",
    title: "Khardung La Pass",
    description: "High-altitude roads, thin air, and ridges fading into the sky.",
    image: u("photo-1464822759023-fed622ff2c3b"),
  },
  {
    tag: "Historic",
    title: "Leh Palace",
    description: "Sunlit windows over the old town—stories stacked like stone.",
    image: u("photo-1564507592333-c60657eea523"),
  },
  {
    tag: "Nature",
    title: "Pangong Lake",
    description: "Turquoise water and quiet shores at the roof of the world.",
    image: u("photo-1501785888041-af3ef285b470"),
  },
  {
    tag: "Desert",
    title: "Nubra Valley",
    description: "Dunes, camels, and geometry carved by wind and light.",
    image: u("photo-1509316785289-025f5b846b35"),
  },
  {
    tag: "Spiritual",
    title: "Monastery trail",
    description: "Prayer flags, stillness, and horizons that feel endless.",
    image: u("photo-1528360983277-13d401cdc186"),
  },
]

/**
 * 3D cover-flow: card width matches Tailwind `md:w-96` (384px). Equal gap between neighbors.
 */
const COVER_CARD_W = 384
const COVER_GAP_PX = 48
const COVER_X_STEP = COVER_CARD_W + COVER_GAP_PX
/** Outer span: centers at ±2·step, plus half a card each side. */
const COVER_TRACK_MIN_WIDTH_PX = 4 * COVER_X_STEP + COVER_CARD_W

function coverFlowStyle(index, centerIndex = 2) {
  const rel = index - centerIndex
  const rotateY = rel * -13.5
  const translateX = rel * COVER_X_STEP
  const translateZ = 52 - Math.abs(rel) * 22
  const scale = Math.max(0.87, 1 - Math.abs(rel) * 0.052)
  const zIndex = 24 - Math.abs(rel) * 4 + (rel === 0 ? 4 : 0)
  return {
    transform: `translate(-50%, -50%) translateX(${translateX}px) rotateY(${rotateY}deg) translateZ(${translateZ}px) scale(${scale})`,
    zIndex,
  }
}

function MemoryCard({ memory, linkTo, className = "" }) {
  const [imgSrc, setImgSrc] = useState(memory.image)

  return (
    <article
      className={`group relative aspect-[3/4] w-[min(90vw,300px)] shrink-0 overflow-hidden rounded-2xl bg-zinc-800 shadow-xl ring-1 ring-black/10 drop-shadow-[0_20px_48px_rgba(15,23,42,0.22)] dark:ring-white/10 sm:w-80 md:w-96 ${className}`}
    >
      <div className="absolute inset-0 isolate overflow-hidden">
        <img
          src={imgSrc}
          alt=""
          width={900}
          height={1200}
          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 320px, 384px"
          className="h-full w-full object-cover brightness-[1.06] contrast-[1.05] saturate-[1.08] transition duration-300 ease-out group-hover:brightness-[1.12]"
          loading="lazy"
          decoding="async"
          onError={() => setImgSrc(DESTINATION_IMAGE_FALLBACK)}
        />
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-black via-black/50 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[28%] bg-gradient-to-t from-black/88 to-transparent"
        aria-hidden
      />

      <span className="absolute left-3 top-3 z-[1] inline-flex items-center rounded-full border border-white/30 bg-white/98 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-900 shadow-md sm:left-4 sm:top-4 sm:px-3 sm:py-1.5">
        {memory.tag}
      </span>

      <Link
        to={linkTo}
        className="absolute right-3 top-3 z-[1] flex h-9 w-9 items-center justify-center rounded-full border border-white/35 bg-zinc-950/50 text-white shadow-md ring-1 ring-white/10 transition hover:border-primary/60 hover:bg-primary hover:text-primary-foreground hover:ring-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:right-4 sm:top-4 sm:h-10 sm:w-10"
        aria-label={`Explore itineraries — ${memory.title}`}
      >
        <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2} aria-hidden />
      </Link>

      <div className="absolute inset-x-0 bottom-0 z-[1] px-4 pb-5 pt-14 sm:px-5 sm:pb-6 sm:pt-16">
        <div className="rounded-xl border border-white/12 bg-black/70 px-3 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.45)] sm:px-4 sm:py-3.5">
          <p
            className="mb-1.5 text-[12px] font-medium leading-relaxed text-white sm:mb-2 sm:text-[13px] md:text-sm"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.9), 0 2px 16px rgba(0,0,0,0.55)" }}
          >
            {memory.description}
          </p>
          <h3
            className="font-heading text-lg font-bold leading-tight tracking-tight text-white sm:text-xl md:text-2xl"
            style={{ textShadow: "0 2px 4px rgba(0,0,0,0.95), 0 4px 20px rgba(0,0,0,0.6)" }}
          >
            {memory.title}
          </h3>
        </div>
      </div>
    </article>
  )
}

const MemoriesMadeSection = () => {
  const { isAuthenticated } = useAuth()
  const browseLink = isAuthenticated ? "/itineraries" : guardLogin("/itineraries")

  return (
    <section className="relative overflow-x-hidden bg-gradient-to-b from-background via-muted/25 to-background py-20 md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent"
      />

      <div className="relative z-[1] mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mx-auto mb-12 max-w-2xl text-center md:mb-16">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Travel stories</p>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-[2.65rem] md:leading-tight">
            Memories Made with Us
          </h2>
          <p className="mt-5 text-base font-normal leading-relaxed text-muted-foreground sm:text-[17px]">
            Journeys our travelers still talk about—high passes, still water, old towns, and moments that belong on a
            wall, not only in a camera roll.
          </p>
        </header>

        {/* Small / medium: flat horizontal strip */}
        <div className="overflow-x-auto overflow-y-visible pb-3 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
          <div
            className="mx-auto flex min-w-full w-max snap-x snap-mandatory flex-nowrap justify-center px-3 md:px-4"
            style={{ gap: `${COVER_GAP_PX}px` }}
          >
            {MEMORIES.map((memory) => (
              <div key={memory.title} className="snap-center shrink-0">
                <MemoryCard memory={memory} linkTo={browseLink} />
              </div>
            ))}
          </div>
        </div>

        {/* Large screens: 3D cover-flow (perspective + rotateY + translateZ + translateX) */}
        <div
          className="memories-cover-stage relative mx-auto hidden min-h-[30rem] overflow-x-auto overflow-y-visible px-2 py-10 lg:block xl:min-h-[36rem]"
          style={{ perspective: "1750px" }}
        >
          <div
            className="memories-cover-track relative mx-auto h-[min(36rem,78vw)] max-w-[120rem]"
            style={{
              transformStyle: "preserve-3d",
              minWidth: `${COVER_TRACK_MIN_WIDTH_PX}px`,
            }}
          >
            {MEMORIES.map((memory, i) => (
              <div
                key={memory.title}
                className="memories-cover-item pointer-events-none absolute left-1/2 top-1/2 w-[min(90vw,300px)] sm:w-80 md:w-96"
                style={{
                  ...coverFlowStyle(i),
                  transformStyle: "preserve-3d",
                }}
              >
                <div className="pointer-events-auto">{/* restore clicks inside card */}
                  <MemoryCard memory={memory} linkTo={browseLink} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="mx-auto mt-10 max-w-xl text-center text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/90 md:mt-12">
          Photos suggest the spirit of travel; itineraries and availability vary by destination.
        </p>
      </div>
    </section>
  )
}

export default MemoriesMadeSection
