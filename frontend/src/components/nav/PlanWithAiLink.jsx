"use client"

import { Link } from "react-router-dom"
import { MessageCircle, Sparkles } from "lucide-react"

export const PLAN_WITH_AI_HREF = "/ai-itinerary"

function PlanWithAiIcon({ className = "h-4 w-4" }) {
  return (
    <span className={`relative inline-flex shrink-0 ${className}`} aria-hidden>
      <MessageCircle className="h-full w-full" strokeWidth={2} />
      <Sparkles className="absolute -top-0.5 -right-1 h-2.5 w-2.5" strokeWidth={2.5} />
    </span>
  )
}

export default function PlanWithAiLink({ isActive, onNavigate, className = "" }) {
  return (
    <Link
      to={PLAN_WITH_AI_HREF}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={`nav-plan-with-ai focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
        isActive ? "nav-plan-with-ai-active" : ""
      } ${className}`}
    >
      <PlanWithAiIcon />
      <span>Plan with AI</span>
    </Link>
  )
}
