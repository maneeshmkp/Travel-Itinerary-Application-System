"use client"

import { Link } from "react-router-dom"
import { X } from "lucide-react"
import { useNotificationRealtime } from "../../context/NotificationRealtimeContext"

function actionPath(actionUrl) {
  if (!actionUrl) return "/notifications"
  try {
    if (actionUrl.startsWith("http")) {
      const u = new URL(actionUrl)
      return `${u.pathname}${u.search}${u.hash}` || "/notifications"
    }
  } catch {
    /* fall through */
  }
  return actionUrl.startsWith("/") ? actionUrl : `/${actionUrl}`
}

export default function NotificationLiveToasts() {
  const { liveToasts, dismissToast } = useNotificationRealtime()

  if (!liveToasts.length) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-16 z-[80] flex flex-col items-end gap-2 px-3 sm:px-4 md:top-20"
      aria-live="polite"
    >
      {liveToasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto w-full max-w-sm animate-slide-up rounded-xl border border-border bg-card p-3 shadow-lg ring-1 ring-black/5 dark:ring-white/10"
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 text-lg leading-none" aria-hidden>
              {t.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground line-clamp-1">{t.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{t.message}</p>
              <Link
                to={actionPath(t.actionUrl)}
                onClick={() => dismissToast(t.id)}
                className="mt-1.5 inline-block text-xs font-medium text-primary hover:underline"
              >
                View
              </Link>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
