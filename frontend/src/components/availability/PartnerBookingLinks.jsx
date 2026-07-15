"use client"

import { ExternalLink } from "lucide-react"

const btnPartner =
  "w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"

function PartnerLink({ link, onClick }) {
  if (!link?.url) return null

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={btnPartner}
      title={`Open ${link.provider || link.label} in a new tab`}
      onClick={() => onClick?.(link)}
    >
      <span aria-hidden>{link.icon || "🔗"}</span>
      <span className="truncate">{link.label}</span>
      <ExternalLink className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
    </a>
  )
}

export default function PartnerBookingLinks({ partnerLinks = [], onPartnerClick }) {
  if (!partnerLinks.length) return null

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-3">
      {partnerLinks.map((link) => (
        <PartnerLink key={link.id} link={link} onClick={onPartnerClick} />
      ))}
    </div>
  )
}
