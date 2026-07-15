"use client"

import { Link, useLocation } from "react-router-dom"
import { MOBILE_BOTTOM_NAV, MOBILE_BOTTOM_NAV_GUEST, isNavActive } from "./navConfig"

export default function MobileBottomNav({ isAuthenticated, onProfileOpen, hidden = false }) {
  const location = useLocation()
  if (hidden) return null
  const items = isAuthenticated ? MOBILE_BOTTOM_NAV : MOBILE_BOTTOM_NAV_GUEST

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-5 h-16">
        {items.map((item) => {
          const Icon = item.icon
          const isProfile = item.href === "__profile__"
          const active = isProfile
            ? false
            : isNavActive(location.pathname, item.href)

          if (isProfile) {
            return (
              <button
                key={item.name}
                type="button"
                onClick={onProfileOpen}
                className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:text-primary"
                aria-label="Open profile menu"
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </button>
            )
          }

          return (
            <Link
              key={item.href}
              to={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors focus:outline-none focus-visible:text-primary ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "scale-110" : ""} transition-transform`} />
              {item.name}
              {active ? <span className="sr-only"> (current)</span> : null}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
