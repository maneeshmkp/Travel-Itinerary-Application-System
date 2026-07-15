"use client"

import { Mic, MicOff } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

export default function VoiceInputButton({ onTranscript, disabled }) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const recognitionRef = useRef(null)

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    setSupported(Boolean(SR))
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return

    const rec = new SR()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = "en-IN"

    rec.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript || ""
      if (text.trim()) onTranscript?.(text.trim(), { autoSubmit: true })
      setListening(false)
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)

    recognitionRef.current = rec
    rec.start()
    setListening(true)
  }, [onTranscript])

  const toggle = () => {
    if (listening) stop()
    else start()
  }

  if (!supported) return null

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
        listening ? "bg-destructive/15 text-destructive animate-pulse" : "text-muted-foreground hover:bg-muted"
      }`}
      aria-label={listening ? "Stop listening" : "Voice input"}
      title="Voice input"
    >
      {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </button>
  )
}
