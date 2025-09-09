"use client"

import { useState, useEffect } from "react"
import { CheckCircle, AlertCircle, X } from "lucide-react"

const Toast = ({ type = "success", message, onClose, duration = 5000 }) => {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // Allow fade out animation
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300)
  }

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
  }

  const colors = {
    success: "bg-primary text-primary-foreground",
    error: "bg-destructive text-destructive-foreground",
  }

  const Icon = icons[type]

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
        colors[type]
      } ${isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}`}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="font-medium">{message}</span>
      <button onClick={handleClose} className="ml-2 hover:opacity-80 transition-opacity">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export default Toast
