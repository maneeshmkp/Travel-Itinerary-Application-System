"use client"

import { MessageCircle } from "lucide-react"

/** Single floating AI entry point (bottom-right) — replaces scattered AI cards. */
export default function FloatingAiButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg shadow-primary/30 px-4 py-3 text-sm font-semibold hover:scale-105 active:scale-95 transition-transform"
      aria-label="Open AI travel copilot"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden sm:inline">AI Copilot</span>
    </button>
  )
}
