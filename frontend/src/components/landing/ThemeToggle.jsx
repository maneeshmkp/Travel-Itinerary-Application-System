"use client"

/**
 * ThemeToggle — light / dark mode via `html.dark` class (matches existing CSS tokens).
 */
import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

const STORAGE_KEY = "travelplan-theme"

function getPreferred() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "dark" || stored === "light") return stored
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark"
  }
  return "light"
}

function applyTheme(mode) {
  const root = document.documentElement
  if (mode === "dark") root.classList.add("dark")
  else root.classList.remove("dark")
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    /* ignore */
  }
}

export default function ThemeToggle({ className = "" }) {
  const [mode, setMode] = useState("light")

  useEffect(() => {
    const initial = getPreferred()
    setMode(initial)
    applyTheme(initial)
  }, [])

  const toggle = () => {
    const next = mode === "dark" ? "light" : "dark"
    setMode(next)
    applyTheme(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/80 bg-background/70 text-foreground backdrop-blur-md transition hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
      aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={mode === "dark" ? "Light mode" : "Dark mode"}
    >
      {mode === "dark" ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
    </button>
  )
}

/** Call once at app boot if needed outside React */
export function initThemeFromStorage() {
  applyTheme(getPreferred())
}
