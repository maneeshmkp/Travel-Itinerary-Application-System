import { Link } from "react-router-dom"
import { MapPin, Mail, Github, Linkedin } from "lucide-react"
import { CONTACT_EMAIL, GITHUB_URL, LINKEDIN_URL } from "../constants/landing"

const social = [
  { href: GITHUB_URL, icon: Github, label: "GitHub" },
  { href: LINKEDIN_URL, icon: Linkedin, label: "LinkedIn" },
  { href: `mailto:${CONTACT_EMAIL}`, icon: Mail, label: "Email" },
]

const productLinks = [
  { to: "/#features", label: "Features" },
  { to: "/itineraries", label: "Browse itineraries" },
  { to: "/ai-itinerary", label: "AI itinerary" },
  { to: "/chat", label: "AI Copilot" },
  { to: "/blogs", label: "Travel blog" },
]

const resourceLinks = [
  { href: GITHUB_URL, label: "GitHub repository" },
  { href: GITHUB_URL + "#readme", label: "Setup guide (README)" },
  { to: "/#docs", label: "API documentation" },
  { to: "/#architecture", label: "Architecture" },
]

const legalLinks = [
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms of Service" },
]

function FooterSectionTitle({ children }) {
  return (
    <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{children}</h2>
  )
}

function FooterLink({ to, children }) {
  return (
    <Link
      to={to}
      className="block py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:text-foreground focus-visible:underline"
    >
      {children}
    </Link>
  )
}

function FooterExtLink({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:text-foreground focus-visible:underline"
    >
      {children}
    </a>
  )
}

const Footer = () => {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-border bg-muted/25">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 py-14 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8 lg:py-16">
          <div className="sm:col-span-2 lg:col-span-4 lg:pr-6">
            <Link
              to="/"
              className="mb-5 inline-flex items-center gap-2.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <MapPin className="h-7 w-7 shrink-0 text-primary" aria-hidden />
              <span className="font-heading text-lg font-semibold tracking-tight text-foreground">TravelPlan</span>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              AI travel management for itineraries, bookings, expenses, flights, and ops—backed by Redis, BullMQ, and
              enterprise security.
            </p>
            <div className="mt-6 flex items-center gap-3 border-t border-border/60 pt-6">
              {social.map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith("mailto:") ? undefined : "_blank"}
                  rel={href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:border-muted-foreground/30 hover:text-foreground"
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </a>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <FooterSectionTitle>Product</FooterSectionTitle>
            <nav aria-label="Product">
              <ul className="space-y-0">
                {productLinks.map(({ to, label }) => (
                  <li key={to}>
                    <FooterLink to={to}>{label}</FooterLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="lg:col-span-3">
            <FooterSectionTitle>Resources</FooterSectionTitle>
            <nav aria-label="Resources">
              <ul>
                {resourceLinks.map((link) => (
                  <li key={link.label}>
                    {link.to ? (
                      <FooterLink to={link.to}>{link.label}</FooterLink>
                    ) : (
                      <FooterExtLink href={link.href}>{link.label}</FooterExtLink>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="lg:col-span-3">
            <FooterSectionTitle>Legal & contact</FooterSectionTitle>
            <nav aria-label="Legal" className="mb-4">
              <ul>
                {legalLinks.map(({ to, label }) => (
                  <li key={to}>
                    <FooterLink to={to}>{label}</FooterLink>
                  </li>
                ))}
              </ul>
            </nav>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center gap-2.5 text-sm text-muted-foreground transition hover:text-foreground"
            >
              <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span className="break-all">{CONTACT_EMAIL}</span>
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="text-xs text-muted-foreground sm:order-1">© {year} TravelPlan. All rights reserved.</p>
          <p className="text-xs text-muted-foreground sm:text-right sm:order-2">
            Itineraries and AI suggestions are planning aids—not travel advice or confirmed bookings.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
