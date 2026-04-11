"use client"

import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

const TermsOfService = () => {
  return (
    <div className="min-h-[70vh] bg-background py-14 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/"
          className="mb-10 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          Back to home
        </Link>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: April 7, 2026</p>

        <div className="mt-10 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <p>
            By accessing or using TravelPlan, you agree to these terms. If you do not agree, please do not use the
            service.
          </p>
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">Use of the service</h2>
            <p>
              You are responsible for the accuracy of itinerary information you enter and for complying with applicable
              laws. AI-generated content is for inspiration only; you should verify details before booking or
              traveling.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">Accounts</h2>
            <p>
              Where accounts are offered, you must keep your credentials secure and notify us of unauthorized use. We
              may suspend access that violates these terms or threatens the security of the platform.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">Disclaimer</h2>
            <p>
              The service is provided as-is, without warranties of any kind. We are not liable for travel decisions,
              third-party services, or losses arising from reliance on generated content.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">Contact</h2>
            <p>
              <a href="mailto:hello@travelplan.com" className="font-medium text-primary hover:underline">
                hello@travelplan.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

export default TermsOfService
