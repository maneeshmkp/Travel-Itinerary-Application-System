"use client"

import { ExternalLink } from "lucide-react"
import PartnerBookingLinks from "./PartnerBookingLinks"

const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
const btnSecondary =
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"

function SafeBookingLink({ href, className, disabled, onNavigate, children, title }) {
  if (disabled || !href) {
    return (
      <button type="button" className={className} disabled title={title}>
        {children}
      </button>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title={title}
      onClick={() => onNavigate?.()}
    >
      {children}
    </a>
  )
}

export function FlightBookingActions({ flight, onBook, onViewDetails }) {
  const canBook = Boolean(flight?.bookingUrl)

  return (
    <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3">
      <SafeBookingLink
        href={flight?.bookingUrl}
        className={btnSecondary}
        disabled={!canBook}
        title={canBook ? "View on Google Flights" : "Booking link unavailable"}
        onNavigate={() => onViewDetails?.(flight)}
      >
        <span aria-hidden>✈</span>
        View Details
      </SafeBookingLink>
      <SafeBookingLink
        href={flight?.bookingUrl}
        className={btnPrimary}
        disabled={!canBook}
        title={canBook ? "Continue on Google Flights" : "Booking unavailable"}
        onNavigate={() => onBook?.(flight)}
      >
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        {canBook ? "Book Flight" : "Booking unavailable"}
      </SafeBookingLink>
    </div>
  )
}

export function HotelBookingActions({ hotel, onBook, onViewHotel }) {
  const canBook = Boolean(hotel?.bookingUrl)

  return (
    <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3">
      <SafeBookingLink
        href={hotel?.bookingUrl}
        className={btnSecondary}
        disabled={!canBook}
        title={canBook ? "View on Google Hotels" : "Booking link unavailable"}
        onNavigate={() => onViewHotel?.(hotel)}
      >
        <span aria-hidden>🏨</span>
        View Hotel
      </SafeBookingLink>
      <SafeBookingLink
        href={hotel?.bookingUrl}
        className={btnPrimary}
        disabled={!canBook}
        title={canBook ? "Continue on Google Hotels" : "Booking unavailable"}
        onNavigate={() => onBook?.(hotel)}
      >
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        {canBook ? "Book Hotel" : "Booking unavailable"}
      </SafeBookingLink>
    </div>
  )
}

export function TrainBookingActions({ train, onPartnerClick }) {
  if (train?.partnerLinks?.length) {
    return <PartnerBookingLinks partnerLinks={train.partnerLinks} onPartnerClick={onPartnerClick} />
  }

  const canBook = Boolean(train?.bookingUrl)

  return (
    <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3">
      <SafeBookingLink
        href={train?.bookingUrl}
        className={btnPrimary}
        disabled={!canBook}
        title={canBook ? "Check trains on IRCTC" : "Booking unavailable"}
        onNavigate={() => onPartnerClick?.({ provider: train?.bookingProvider, url: train?.bookingUrl })}
      >
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        {canBook ? "Book Train" : "Booking unavailable"}
      </SafeBookingLink>
    </div>
  )
}

export function BusBookingActions({ bus, onPartnerClick }) {
  if (bus?.partnerLinks?.length) {
    return <PartnerBookingLinks partnerLinks={bus.partnerLinks} onPartnerClick={onPartnerClick} />
  }

  const canBook = Boolean(bus?.bookingUrl)

  return (
    <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3">
      <SafeBookingLink
        href={bus?.bookingUrl}
        className={btnPrimary}
        disabled={!canBook}
        title={canBook ? "Continue to redBus" : "Booking unavailable"}
        onNavigate={() => onPartnerClick?.({ provider: bus?.bookingProvider, url: bus?.bookingUrl })}
      >
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        {canBook ? "Book Bus" : "Booking unavailable"}
      </SafeBookingLink>
    </div>
  )
}
