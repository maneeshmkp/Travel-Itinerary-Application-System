"use client"

import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { AtSign, Mic, Plus, Send, Smile } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { useAskAi } from "../../context/AskAiContext"

const EMOJIS = ["😊", "🏖️", "🏔️", "🗺️", "✈️", "🏨", "🍜", "📸", "🎒", "🌴", "🚗", "⛩️"]

const QUICK_PROMPTS = [
  "Plan a 5-day beach trip",
  "Weekend getaway near me",
  "Family-friendly itinerary",
  "Budget backpacking route",
]

const GUARD_MESSAGE = "Please login to access this feature"

const guardLogin = (pathname, search = "") => ({
  pathname: "/login",
  state: { from: { pathname, search }, message: GUARD_MESSAGE },
})

const u = (id, w = 400) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`

const COLLAGE_PHOTOS = [
  {
    src: u("photo-1571896349842-33c89424de2d"),
    alt: "Resort",
    className: "top-[4%] left-[2%] w-[5.5rem] h-[4.5rem] sm:w-24 sm:h-20 rotate-[-6deg]",
  },
  {
    src: u("photo-1507525428034-b723cf961d3e"),
    alt: "Beach",
    className: "top-[2%] right-[18%] w-[4.5rem] h-[4.5rem] sm:w-20 sm:h-20 rotate-[8deg]",
  },
  {
    src: u("photo-1516450360452-9312f5e86fc7"),
    alt: "Theater",
    className: "top-[22%] right-[2%] w-[5rem] h-[5.5rem] sm:w-[5.5rem] sm:h-24 rotate-[4deg]",
  },
  {
    src: u("photo-1544551763-46a013bb70d5"),
    alt: "Wildlife",
    className: "bottom-[38%] left-[0%] w-[4.5rem] h-[4.5rem] sm:w-20 sm:h-20 rotate-[-10deg]",
  },
  {
    src: u("photo-1566073771259-6a8506099945"),
    alt: "Historic",
    className: "bottom-[42%] right-[6%] w-[5rem] h-[5rem] sm:w-[5.5rem] sm:h-[5.5rem] rotate-[6deg]",
  },
  {
    src: u("photo-1414235077428-338989a2e8c0"),
    alt: "Dining",
    className: "bottom-[18%] left-[12%] w-[5.5rem] h-[4.5rem] sm:w-24 sm:h-20 rotate-[-4deg]",
  },
  {
    src: u("photo-1530549387789-4c1017266635"),
    alt: "Water sports",
    className: "bottom-[14%] right-[20%] w-[4.5rem] h-[4.5rem] sm:w-20 sm:h-20 rotate-[12deg]",
  },
]

const CATEGORY_TAGS = [
  { label: "Spa / Wellness", emoji: "🧘", className: "top-[14%] left-[22%]" },
  { label: "Beach", emoji: "🏖️", className: "top-[8%] right-[4%]" },
  { label: "Theater", emoji: "🎭", className: "top-[34%] right-[24%]" },
  { label: "Resorts", emoji: "🏘️", className: "top-[28%] left-[6%]" },
  { label: "Wildlife", emoji: "🦅", className: "bottom-[52%] left-[28%]" },
  { label: "Historical Tours", emoji: "🏛️", className: "bottom-[48%] right-[0%]" },
  { label: "Cycling", emoji: "🚴", className: "bottom-[28%] left-[2%]" },
  { label: "Fine Dining", emoji: "🍽️", className: "bottom-[22%] right-[32%]" },
  { label: "Water Sports", emoji: "🛶", className: "bottom-[8%] left-[34%]" },
]

function CollagePhoto({ src, alt, className }) {
  return (
    <div
      className={`absolute overflow-hidden rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] ring-1 ring-black/5 transition-transform duration-300 hover:scale-105 hover:z-20 ${className}`}
    >
      <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
    </div>
  )
}

function CategoryPill({ label, emoji, className }) {
  return (
    <span
      className={`absolute inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-[0_4px_14px_rgba(0,0,0,0.08)] ${className}`}
    >
      <span aria-hidden>{emoji}</span>
      {label}
    </span>
  )
}

function ChatPillBar({ children, className = "" }) {
  return (
    <div className={`ui-pill-field relative z-10 -mt-2 ${className}`}>
      {children}
    </div>
  )
}

export default function HowItWorksSection() {
  const { isAuthenticated } = useAuth()
  const { openAskAi } = useAskAi()
  const [query, setQuery] = useState("")
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [promptsOpen, setPromptsOpen] = useState(false)
  const [listening, setListening] = useState(false)
  const inputRef = useRef(null)
  const barRef = useRef(null)
  const recognitionRef = useRef(null)

  const speechSupported =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)

  const handleChatSubmit = (e) => {
    e.preventDefault()
    const message = query.trim()
    if (!message) return
    if (!isAuthenticated) return
    openAskAi(message)
    setQuery("")
  }

  // Insert text at the input's caret position, keeping focus.
  const insertAtCaret = (text) => {
    const el = inputRef.current
    if (!el) {
      setQuery((q) => q + text)
      return
    }
    const start = el.selectionStart ?? query.length
    const end = el.selectionEnd ?? query.length
    const next = query.slice(0, start) + text + query.slice(end)
    setQuery(next)
    requestAnimationFrame(() => {
      el.focus()
      const caret = start + text.length
      el.setSelectionRange(caret, caret)
    })
  }

  const handleEmoji = (emoji) => {
    insertAtCaret(emoji)
    setEmojiOpen(false)
  }

  const handleMention = () => {
    insertAtCaret("@")
    setEmojiOpen(false)
    setPromptsOpen(false)
  }

  const handleQuickPrompt = (prompt) => {
    setQuery(prompt)
    setPromptsOpen(false)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const toggleVoice = () => {
    if (!speechSupported) {
      inputRef.current?.focus()
      return
    }
    if (listening) {
      recognitionRef.current?.stop()
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SR()
    recognition.lang = "en-US"
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0]?.transcript ?? "")
        .join(" ")
        .trim()
      if (transcript) insertAtCaret((query ? " " : "") + transcript)
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognitionRef.current = recognition
    setListening(true)
    recognition.start()
  }

  // Close popovers on outside click.
  useEffect(() => {
    const onDoc = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) {
        setEmojiOpen(false)
        setPromptsOpen(false)
      }
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  useEffect(() => () => recognitionRef.current?.abort?.(), [])

  const aiLink = isAuthenticated ? "/ai-itinerary" : guardLogin("/ai-itinerary")

  return (
    <section className="relative bg-background py-20 md:py-28 lg:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="type-section-title text-center mb-14 md:mb-20 lg:mb-24">
          How it Works
        </h2>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 xl:gap-24 items-center">
          <div className="max-w-xl mx-auto lg:mx-0 text-center lg:text-left">
            <h3 className="type-section-heading mb-6">
              Start chatting with us.
            </h3>
            <p className="type-lead">
              Tell us what you&apos;re looking for — a weekend escape, a family trip, or a
              once-in-a-lifetime adventure. TravelPlan&apos;s AI brings destinations to you and
              helps you build calm, day-by-day itineraries. Ask about hotels, activities, or
              hidden gems — we&apos;ll shape the perfect plan around your style.
            </p>
            <p className="mt-6">
              {isAuthenticated ? (
                <Link to="/ai-itinerary" className="type-link">
                  Open full AI planner →
                </Link>
              ) : (
                <Link to={guardLogin("/ai-itinerary")} className="type-link">
                  Sign in to plan with AI →
                </Link>
              )}
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <div className="relative h-[22rem] sm:h-[26rem] md:h-[30rem] lg:h-[32rem]">
              {COLLAGE_PHOTOS.map((photo) => (
                <CollagePhoto key={photo.alt} {...photo} />
              ))}

              {CATEGORY_TAGS.map((tag) => (
                <CategoryPill key={tag.label} {...tag} />
              ))}

              <div
                className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-gradient-to-br from-rose-100 to-amber-100 ring-4 ring-background shadow-lg dark:from-rose-900/40 dark:to-amber-900/30"
                aria-hidden
              >
                <span className="text-3xl sm:text-4xl">🧳</span>
              </div>
            </div>

            {isAuthenticated ? (
              <form onSubmit={handleChatSubmit} ref={barRef} className="relative">
                {emojiOpen ? (
                  <div className="absolute bottom-full left-0 z-20 mb-2 grid grid-cols-6 gap-1 rounded-2xl border border-border bg-card p-2 shadow-lg">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleEmoji(emoji)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-lg hover:bg-muted/60 transition-colors"
                        aria-label={`Insert ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                ) : null}

                {promptsOpen ? (
                  <div className="absolute bottom-full left-0 right-0 z-20 mb-2 flex flex-col gap-1 rounded-2xl border border-border bg-card p-2 shadow-lg">
                    <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Quick prompts</p>
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handleQuickPrompt(prompt)}
                        className="rounded-lg px-2 py-2 text-left text-sm text-foreground hover:bg-muted/60 transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                ) : null}

                <ChatPillBar>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setPromptsOpen((v) => !v)
                        setEmojiOpen(false)
                      }}
                      className={`rounded-full p-1.5 transition-colors ${promptsOpen ? "bg-muted text-foreground" : "ui-pill-icon hover:bg-muted/60"}`}
                      aria-label="Quick prompts"
                      aria-expanded={promptsOpen}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmojiOpen((v) => !v)
                        setPromptsOpen(false)
                      }}
                      className={`rounded-full p-1.5 transition-colors ${emojiOpen ? "bg-muted text-foreground" : "ui-pill-icon hover:bg-muted/60"}`}
                      aria-label="Add emoji"
                      aria-expanded={emojiOpen}
                    >
                      <Smile className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleMention}
                      className="rounded-full p-1.5 ui-pill-icon hover:bg-muted/60 transition-colors"
                      aria-label="Mention a place"
                    >
                      <AtSign className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask us anything..."
                    className="ui-pill-input"
                    aria-label="Ask TravelPlan AI"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={toggleVoice}
                      className={`rounded-full p-1.5 transition-colors ${listening ? "bg-red-500/15 text-red-500 animate-pulse" : "ui-pill-icon hover:bg-muted/60"}`}
                      aria-label={listening ? "Stop voice input" : "Start voice input"}
                      aria-pressed={listening}
                    >
                      <Mic className="h-4 w-4" />
                    </button>
                    <button type="submit" className="ui-pill-send" aria-label="Send message">
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </ChatPillBar>
              </form>
            ) : (
              <Link to={aiLink}>
                <ChatPillBar className="hover:border-foreground/20 transition-colors">
                  <div className="flex items-center gap-1.5 shrink-0 pointer-events-none">
                    <Plus className="h-4 w-4 ui-pill-icon" />
                    <Smile className="h-4 w-4 ui-pill-icon" />
                    <AtSign className="h-4 w-4 ui-pill-icon" />
                  </div>
                  <span className="min-w-0 flex-1 py-1 text-sm text-[color:var(--placeholder)]">Ask us anything...</span>
                  <div className="ui-pill-send pointer-events-none">
                    <Send className="h-4 w-4" />
                  </div>
                </ChatPillBar>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
