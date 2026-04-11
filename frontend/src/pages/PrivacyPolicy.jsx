"use client"

import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

const PrivacyPolicy = () => {
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
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: April 7, 2026</p>

        <div className="mt-10 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <p>
            {
              'TravelPlan ("we", "our") respects your privacy. This policy describes how we handle information when you use our website and itinerary planning features.'
            }
          </p>
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">Information we collect</h2>
            <p>
              We may collect account details you provide (such as email), itinerary content you create, and technical
              data (such as browser type) needed to operate and secure the service.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">How we use information</h2>
            <p>
              We use this information to provide the product, improve features, communicate with you about your account,
              and comply with legal obligations. Third-party AI providers may process itinerary text only as needed to
              generate suggestions, according to their terms and your configuration.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">Contact</h2>
            <p>
              Questions about this policy:{" "}
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

export default PrivacyPolicy
