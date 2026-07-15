"use client"

import { useState, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { MapPin, LogIn, UserPlus } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import NotificationBell from "./notifications/NotificationBell"
import NavbarSearch from "./nav/NavbarSearch"
import UserMenu from "./nav/UserMenu"
import ProfileMenuPanel from "./nav/ProfileMenuPanel"
import MobileBottomNav from "./nav/MobileBottomNav"
import FloatingCreateButton from "./nav/FloatingCreateButton"
import PresenceIndicator from "./nav/PresenceIndicator"
import MoreMenu from "./nav/MoreMenu"
import PlanWithAiLink, { PLAN_WITH_AI_HREF } from "./nav/PlanWithAiLink"
import ThemeToggle from "./landing/ThemeToggle"
import { PRIMARY_NAV, SECONDARY_NAV, isNavActive, userInitials } from "./nav/navConfig"

const HIDE_SEARCH_PATHS = new Set(["/", "/itineraries", "/chat"])

function NavItem({ item, active, compact = false, onNavigate, onHero = false }) {
  const Icon = item.icon
  const inactive = onHero
    ? "text-foreground hover:text-foreground hover:bg-foreground/5"
    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
  return (
    <Link
      to={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center gap-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        compact ? "px-2.5 py-2" : "px-3 py-2"
      } ${active ? "bg-primary/10 text-primary" : inactive}`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{item.name}</span>
    </Link>
  )
}

const Navbar = () => {
  const location = useLocation()
  const { isAuthenticated, user } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const pathname = location.pathname

  const hideSearch = HIDE_SEARCH_PATHS.has(pathname)
  const isChat = pathname === "/chat"
  const isHome = pathname === "/"
  const isWorkspaceItinerary = /^\/itineraries\/[^/]+$/.test(pathname)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!isHome) {
      setScrolled(false)
      return
    }
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [isHome])

  const navTransparent = isHome && !scrolled

  // "Plan with AI" sits right after the logo; the rest keep their tight spacing.
  const restNav = PRIMARY_NAV.filter((item) => item.href !== PLAN_WITH_AI_HREF)
  // Tablet: Plan with AI + first two links, remaining go into the More menu.
  const tabletRest = restNav.slice(0, 2)
  const tabletMore = [...restNav.slice(2), ...SECONDARY_NAV]

  const closeMenus = () => {
    setProfileOpen(false)
    setMoreOpen(false)
  }

  useEffect(() => {
    closeMenus()
  }, [pathname])

  if (isChat) return null

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          navTransparent
            ? "border-b border-transparent bg-transparent shadow-none"
            : "border-b border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75 shadow-sm"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex h-14 md:h-16 items-center gap-3 md:gap-4">
            {/* Brand */}
            <Link
              to="/"
              className="flex items-center gap-2 shrink-0 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
              onClick={closeMenus}
            >
              <MapPin className="h-6 w-6 text-primary transition-transform group-hover:scale-105" />
              <span className="font-heading font-bold text-lg text-foreground tracking-tight hidden sm:inline">
                TravelPlan
              </span>
            </Link>

            {/* Spacer pushes the nav group toward the right on pages without search (home) */}
            {hideSearch ? <div className="hidden md:block flex-1" /> : null}

            {/* Desktop navigation — Plan with AI, then a wide gap before the links */}
            {isAuthenticated ? (
              <nav className={`hidden lg:flex items-center gap-x-14 ${hideSearch ? "" : "ml-6 xl:ml-10"}`} aria-label="Primary">
                <PlanWithAiLink
                  isActive={isNavActive(pathname, PLAN_WITH_AI_HREF)}
                  onNavigate={closeMenus}
                />
                <div className="flex items-center gap-1">
                  {restNav.map((item) => (
                    <NavItem
                      key={item.href}
                      item={item}
                      active={isNavActive(pathname, item.href)}
                      onNavigate={closeMenus}
                      onHero={navTransparent}
                    />
                  ))}
                </div>
              </nav>
            ) : (
              <nav className="hidden md:flex items-center gap-0.5 ml-4" aria-label="Primary">
                {SECONDARY_NAV.map((item) => (
                  <NavItem
                    key={item.href}
                    item={item}
                    active={isNavActive(pathname, item.href)}
                    onHero={navTransparent}
                  />
                ))}
              </nav>
            )}

            {/* Tablet navigation — Plan with AI, gap, then links + More */}
            {isAuthenticated ? (
              <nav className={`hidden md:flex lg:hidden items-center gap-x-8 ${hideSearch ? "" : "ml-4"}`} aria-label="Primary">
                <PlanWithAiLink
                  isActive={isNavActive(pathname, PLAN_WITH_AI_HREF)}
                  onNavigate={closeMenus}
                  className="!px-3 !py-1.5 !text-xs"
                />
                <div className="flex items-center gap-1">
                  {tabletRest.map((item) => (
                    <NavItem
                      key={item.href}
                      item={item}
                      active={isNavActive(pathname, item.href)}
                      compact
                      onNavigate={closeMenus}
                      onHero={navTransparent}
                    />
                  ))}
                  <MoreMenu
                    items={tabletMore}
                    pathname={pathname}
                    open={moreOpen}
                    onToggle={() => {
                      setMoreOpen((v) => !v)
                      setProfileOpen(false)
                    }}
                    onClose={() => setMoreOpen(false)}
                  />
                </div>
              </nav>
            ) : null}

            {/* Unified search */}
            {!hideSearch ? (
              <div className="hidden md:flex flex-1 justify-center min-w-0 px-2">
                <NavbarSearch className="w-full max-w-xl" />
              </div>
            ) : null}

            {/* Right actions */}
            <div className={`flex items-center gap-1.5 shrink-0 ${hideSearch ? "ml-auto md:ml-6" : "ml-auto"}`}>
              {!hideSearch ? (
                <div className="md:hidden">
                  <NavbarSearch compact />
                </div>
              ) : null}

              <ThemeToggle />
              {isAuthenticated ? <NotificationBell /> : null}

              {isAuthenticated ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen((v) => !v)
                      setMoreOpen(false)
                    }}
                    className="relative md:hidden flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold hover:bg-primary/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                    aria-haspopup="dialog"
                    aria-expanded={profileOpen}
                    aria-label="Open profile menu"
                  >
                    {userInitials(user)}
                    <PresenceIndicator />
                  </button>
                  <UserMenu
                    open={profileOpen}
                    onToggle={() => {
                      setProfileOpen((v) => !v)
                      setMoreOpen(false)
                    }}
                    onClose={() => setProfileOpen(false)}
                  />
                </>
              ) : (
                <div className="hidden md:flex items-center gap-1.5">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <LogIn className="h-4 w-4" />
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <MobileBottomNav
        isAuthenticated={isAuthenticated}
        onProfileOpen={() => setProfileOpen((v) => !v)}
        hidden={isWorkspaceItinerary}
      />

      {isAuthenticated ? <FloatingCreateButton /> : null}

      {/* Mobile profile sheet when opened from bottom nav */}
      {profileOpen && isAuthenticated ? (
        <div className="md:hidden fixed inset-0 z-[60]" onClick={() => setProfileOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-16 inset-x-0 rounded-t-2xl border-t border-border bg-card p-4 pb-6 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Profile menu"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
            <ProfileMenuPanel onClose={() => setProfileOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  )
}

export default Navbar
