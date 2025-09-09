"use client"

import { useState, useCallback } from "react"

export const useToast = () => {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((type, message) => {
    const id = Date.now()
    const newToast = { id, type, message }

    setToasts((prev) => [...prev, newToast])
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showSuccess = useCallback((message) => showToast("success", message), [showToast])
  const showError = useCallback((message) => showToast("error", message), [showToast])

  return {
    toasts,
    showSuccess,
    showError,
    removeToast,
  }
}
