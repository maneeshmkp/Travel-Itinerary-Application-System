"use client"

/** Shared section chrome for landing pages */
export function LandingSection({ id, eyebrow, title, lead, children, className = "" }) {
  return (
    <section id={id} className={`relative py-20 md:py-28 ${className}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {(eyebrow || title || lead) && (
          <header className="mx-auto mb-12 max-w-3xl text-center md:mb-16">
            {eyebrow ? (
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
            ) : null}
            {title ? <h2 className="type-section-heading text-foreground">{title}</h2> : null}
            {lead ? <p className="type-lead mt-4">{lead}</p> : null}
          </header>
        )}
        {children}
      </div>
    </section>
  )
}

export function GlassCard({ children, className = "" }) {
  return (
    <div
      className={`landing-glass rounded-2xl border border-white/40 bg-white/55 p-5 shadow-[0_8px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/50 dark:shadow-[0_8px_40px_rgba(0,0,0,0.35)] ${className}`}
    >
      {children}
    </div>
  )
}
