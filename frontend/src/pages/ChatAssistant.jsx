"use client"

import { useEffect, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { MessageCircle } from "lucide-react"
import TravelChatPanel from "../components/askAi/TravelChatPanel"
import Toast from "../components/Toast"
import { useToast } from "../hooks/useToast"

export default function ChatAssistant() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toasts, removeToast } = useToast()
  const initialMessageRef = useRef(
    typeof location.state?.initialMessage === "string" ? location.state.initialMessage.trim() : "",
  )

  useEffect(() => {
    if (initialMessageRef.current) {
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.pathname, navigate])

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full max-w-3xl mx-auto px-4 sm:px-6 py-4">
      {toasts.map((toast) => (
        <Toast key={toast.id} type={toast.type} message={toast.message} onClose={() => removeToast(toast.id)} />
      ))}

      <header className="mb-3 shrink-0">
        <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-2">
          <MessageCircle className="h-7 w-7 text-primary" />
          Travel Copilot
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Chat to plan trips, get destination tips, and generate saveable itineraries.
        </p>
      </header>

      <TravelChatPanel
        variant="page"
        initialMessage={initialMessageRef.current}
        className="flex-1 min-h-0"
      />
    </div>
  )
}
