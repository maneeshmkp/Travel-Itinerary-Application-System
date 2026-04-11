"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

const pic = (seed, s = 160) =>
  `https://picsum.photos/seed/${encodeURIComponent(`travelplan-testimonial-${seed}`)}/${s}/${s}`

const IMG_SAT = 256
const IMG_CENTER = 512

/** Fixed decorative faces — three left, three right of the featured traveler. */
const SATELLITE_LEFT = ["orbit-L0", "orbit-L1", "orbit-L2"]
const SATELLITE_RIGHT = ["orbit-R0", "orbit-R1", "orbit-R2"]

const TESTIMONIALS = [
  {
    headline: "Solo trip turned life-changing!",
    quote:
      "I booked a solo trip to Japan — the AI itinerary suggested such offbeat places I'd never have found myself. Met amazing people, had local food tours, and even joined a pottery workshop!",
    name: "Isha",
    location: "Madhya Pradesh",
    avatarSeed: "isha",
  },
  {
    headline: "Family week, zero chaos",
    quote:
      "We used TravelPlan for a 6-day hill-station run with two kids. Day labels, hotels, and activities were all in one place. Sharing the link with grandparents was the easiest part of the whole trip.",
    name: "Rahul",
    location: "Bengaluru",
    avatarSeed: "rahul",
  },
  {
    headline: "Finally a plan we actually followed",
    quote:
      "Usually our spreadsheets die after day two. Here we could tweak times, add highlights, and lean on AI for descriptions when we were tired. Felt like a real product, not a template.",
    name: "Meera",
    location: "Pune",
    avatarSeed: "meera",
  },
]

const satelliteShell =
  "shrink-0 overflow-hidden rounded-full border-[3px] border-white bg-muted shadow-[0_10px_32px_rgba(15,23,42,0.18)] ring-1 ring-black/5 sm:border-[3px] md:border-4 md:shadow-[0_14px_40px_rgba(15,23,42,0.2)] lg:shadow-[0_16px_48px_rgba(15,23,42,0.22)]"

const satelliteSizes =
  "h-12 w-12 sm:h-14 sm:w-14 md:h-[4.25rem] md:w-[4.25rem] lg:h-24 lg:w-24 xl:h-[7rem] xl:w-[7rem] 2xl:h-[7.5rem] 2xl:w-[7.5rem]"

const centerShell =
  "z-10 shrink-0 overflow-hidden rounded-full border-[3px] border-emerald-500 bg-muted shadow-[0_20px_56px_rgba(15,23,42,0.26)] ring-2 ring-white sm:border-[3px] md:border-4 md:shadow-[0_24px_64px_rgba(15,23,42,0.28)] lg:border-[5px] lg:ring-[3px]"

const centerSizes =
  "h-[7.25rem] w-[7.25rem] sm:h-36 sm:w-36 md:h-44 md:w-44 lg:h-56 lg:w-56 xl:h-64 xl:w-64 2xl:h-72 2xl:w-72"

function TestimonialsSection() {
  const [index, setIndex] = useState(0)
  const t = TESTIMONIALS[index]
  const n = TESTIMONIALS.length

  const prev = () => setIndex((i) => (i - 1 + n) % n)
  const next = () => setIndex((i) => (i + 1) % n)

  return (
    <section className="border-t border-border/60 bg-background py-20 sm:py-24 md:py-32 lg:py-40">
      <div className="mx-auto w-full max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="font-heading text-[1.65rem] font-bold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-[3.25rem] xl:text-6xl xl:leading-[1.08]">
          What Our Happy Travelers Say
        </h2>

        <div className="mx-auto mt-12 w-full max-w-7xl origin-center scale-[0.78] min-[380px]:scale-[0.88] min-[420px]:scale-95 sm:mt-14 sm:scale-100 md:mt-16 lg:mt-20">
          <div className="flex flex-nowrap items-center justify-center gap-1.5 min-[380px]:gap-2 sm:gap-3 md:gap-5 lg:gap-7 xl:gap-9 2xl:gap-11">
          {SATELLITE_LEFT.map((seed) => (
            <div key={seed} className={`${satelliteShell} ${satelliteSizes}`}>
              <img
                src={pic(seed, IMG_SAT)}
                alt=""
                width={IMG_SAT}
                height={IMG_SAT}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          ))}

          <div className={`${centerShell} ${centerSizes}`}>
            <img
              src={pic(t.avatarSeed, IMG_CENTER)}
              alt=""
              width={IMG_CENTER}
              height={IMG_CENTER}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>

          {SATELLITE_RIGHT.map((seed) => (
            <div key={seed} className={`${satelliteShell} ${satelliteSizes}`}>
              <img
                src={pic(seed, IMG_SAT)}
                alt=""
                width={IMG_SAT}
                height={IMG_SAT}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          ))}
          </div>
        </div>

        <div className="relative mx-auto mt-14 w-full max-w-4xl md:mt-16 lg:mt-20 lg:max-w-5xl">
          <button
            type="button"
            onClick={prev}
            className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground transition hover:bg-muted/60 hover:opacity-90 sm:h-11 sm:w-11 md:left-1 lg:-left-2 xl:-left-8"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="h-8 w-8 sm:h-9 sm:w-9" strokeWidth={1.35} />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground transition hover:bg-muted/60 hover:opacity-90 sm:h-11 sm:w-11 md:right-1 lg:-right-2 xl:-right-8"
            aria-label="Next testimonial"
          >
            <ChevronRight className="h-8 w-8 sm:h-9 sm:w-9" strokeWidth={1.35} />
          </button>

          <div className="mx-auto max-w-3xl px-11 sm:px-14 md:px-16 lg:max-w-4xl lg:px-20">
            <p className="font-heading text-xl font-bold leading-snug text-foreground sm:text-2xl md:text-3xl lg:text-[2.125rem]">
              {t.headline}
            </p>
            <blockquote className="mt-5 text-base font-normal leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg md:text-xl md:leading-relaxed lg:text-[1.35rem] lg:leading-relaxed">
              &ldquo;{t.quote}&rdquo;
            </blockquote>
            <p className="mt-6 text-base font-semibold text-foreground sm:text-lg md:mt-8">
              — {t.name}, {t.location}
            </p>
          </div>
        </div>

        <div className="mt-10 flex justify-center gap-2 md:mt-12">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-2.5 rounded-full transition-all ${i === index ? "w-10 bg-primary" : "w-2.5 bg-border hover:bg-muted-foreground/40"}`}
              aria-label={`Show testimonial ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default TestimonialsSection
