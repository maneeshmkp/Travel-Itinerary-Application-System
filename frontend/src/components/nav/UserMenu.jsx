"use client"

import { useEffect, useRef } from "react"
import { useAuth } from "../../context/AuthContext"
import PresenceIndicator from "./PresenceIndicator"
import ProfileMenuPanel from "./ProfileMenuPanel"
import { userInitials } from "./navConfig"

function useCloseOnEscape(open, onClose) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])
}

export default function UserMenu({ open, onToggle, onClose, align = "right" }) {
  const { isAuthenticated, user } = useAuth()
  const menuRef = useRef(null)

  useCloseOnEscape(open, onClose)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open, onClose])

  if (!isAuthenticated) return null

  const initials = userInitials(user)

  return (
    <div className="relative hidden md:block" ref={menuRef}>
      <button
        type="button"
        onClick={onToggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold hover:bg-primary/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open profile menu"
      >
        {initials}
        <PresenceIndicator />
      </button>

      {open ? (
        <div
          role="menu"
          className={`absolute top-full mt-2 w-56 rounded-xl border border-border bg-card shadow-lg p-1 z-50 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <ProfileMenuPanel onClose={onClose} className="px-1" />
        </div>
      ) : null}
    </div>
  )
}
