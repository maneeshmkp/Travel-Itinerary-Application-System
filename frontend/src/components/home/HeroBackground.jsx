"use client"

/**
 * Static decorative layers for the landing hero.
 * Modern soft "aurora mesh" — clean, premium, calm. No parallax / cursor tracking.
 */
export default function HeroBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Base wash */}
      <div className="absolute inset-0 hero-studio-bg" />

      {/* Soft color blobs (aurora) */}
      <div className="absolute -top-24 -left-16 h-[26rem] w-[26rem] rounded-full bg-amber-400/40 blur-[90px] dark:bg-amber-500/14" />
      <div className="absolute top-[-6rem] right-[6%] h-[24rem] w-[24rem] rounded-full bg-orange-400/35 blur-[90px] dark:bg-orange-500/14" />
      <div className="absolute bottom-[-8rem] left-[28%] h-[22rem] w-[22rem] rounded-full bg-rose-400/28 blur-[100px] dark:bg-rose-500/12" />
      <div className="absolute top-[30%] right-[26%] h-72 w-72 rounded-full bg-sky-300/22 blur-[100px] dark:bg-sky-500/10" />

      {/* Fine grid for structure (very subtle) */}
      <div
        className="absolute inset-0 opacity-[0.5] dark:opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(120,110,90,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(120,110,90,0.06) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent 80%)",
        }}
      />

      {/* Top sheen */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/25 to-transparent dark:from-white/5" />

      {/* Smooth fade into the page background below the hero */}
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-background" />
    </div>
  )
}
