import { Link } from "react-router-dom"
import { MapPin, Mail, Phone, Github, Twitter, Instagram } from "lucide-react"

const social = [
  { href: "https://twitter.com", icon: Twitter, label: "X (Twitter)" },
  { href: "https://instagram.com", icon: Instagram, label: "Instagram" },
  { href: "https://github.com", icon: Github, label: "GitHub" },
]

const productLinks = [
  { to: "/itineraries", label: "Browse itineraries" },
  { to: "/create", label: "Create itinerary" },
  { to: "/recommendations", label: "Recommendations" },
  { to: "/saved", label: "Saved trips" },
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

const Footer = () => {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-border bg-muted/25">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 py-14 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8 lg:py-16">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-4 lg:pr-6">
            <Link
              to="/"
              className="mb-5 inline-flex items-center gap-2.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <MapPin className="h-7 w-7 shrink-0 text-primary" aria-hidden />
              <span className="font-heading text-lg font-semibold tracking-tight text-foreground">TravelPlan</span>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Plan multi-day trips with structured days, activities, and AI-assisted copy—built for travelers and
              teams who need clear, shareable itineraries.
            </p>
            <div className="mt-6 flex items-center gap-3 border-t border-border/60 pt-6">
              {social.map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:border-muted-foreground/30 hover:text-foreground"
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
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

          {/* Legal */}
          <div className="lg:col-span-2">
            <FooterSectionTitle>Legal</FooterSectionTitle>
            <nav aria-label="Legal">
              <ul>
                {legalLinks.map(({ to, label }) => (
                  <li key={to}>
                    <FooterLink to={to}>{label}</FooterLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Contact */}
          <div className="sm:col-span-2 lg:col-span-4">
            <FooterSectionTitle>Contact</FooterSectionTitle>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href="mailto:hello@travelplan.com"
                  className="inline-flex items-center gap-2.5 text-muted-foreground transition hover:text-foreground"
                >
                  <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="break-all">hello@travelplan.com</span>
                </a>
              </li>
              <li>
                <a
                  href="tel:+918077439938"
                  className="inline-flex items-center gap-2.5 text-muted-foreground transition hover:text-foreground"
                >
                  <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span>+91 (807) 743-9938</span>
                </a>
              </li>
            </ul>
            <p className="mt-5 text-xs leading-relaxed text-muted-foreground/90">
              Business inquiries and support: we aim to respond within two business days.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="text-xs text-muted-foreground sm:order-1">
            © {year} TravelPlan. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground sm:text-right sm:order-2">
            Itineraries and AI suggestions are planning aids only—not travel advice or bookings.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
