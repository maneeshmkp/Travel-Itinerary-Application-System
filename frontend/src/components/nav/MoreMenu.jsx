"use client"

import { useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { MoreHorizontal, ChevronDown } from "lucide-react"
import { isNavActive } from "./navConfig"

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

export default function MoreMenu({ items, pathname, open, onToggle, onClose }) {
  const ref = useRef(null)

  useCloseOnEscape(open, onClose)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open, onClose])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
          items.some((i) => isNavActive(pathname, i.href))
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
        }`}
      >
        <MoreHorizontal className="h-4 w-4" />
        More
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1 min-w-[11rem] rounded-xl border border-border bg-card py-1 shadow-lg z-50"
        >
          {items.map((item) => {
            const Icon = item.icon
            const active = isNavActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                to={item.href}
                role="menuitem"
                onClick={onClose}
                className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted focus:outline-none focus-visible:bg-muted ${
                  active ? "text-primary font-medium" : "text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                {item.name}
              </Link>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
