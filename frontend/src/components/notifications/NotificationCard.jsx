import {
  Bell,
  Calendar,
  CloudRain,
  Plane,
  Hotel,
  Wallet,
  Users,
  Ticket,
  Sparkles,
  AlertTriangle,
} from "lucide-react"
import { notificationIconType } from "../../constants/notificationTypes"

const ICONS = {
  bell: Bell,
  calendar: Calendar,
  "cloud-rain": CloudRain,
  plane: Plane,
  hotel: Hotel,
  wallet: Wallet,
  users: Users,
  ticket: Ticket,
  sparkles: Sparkles,
}

const PRIORITY_STYLES = {
  HIGH: "border-l-red-500 bg-red-50/50 dark:bg-red-950/20",
  MEDIUM: "border-l-primary bg-card",
  LOW: "border-l-muted-foreground/30 bg-card",
}

export default function NotificationCard({
  notification,
  compact = false,
  onMarkRead,
  onDelete,
  onArchive,
}) {
  const iconKey = notificationIconType(notification.type)
  const Icon = ICONS[iconKey] || Bell
  const isUnread = notification.status === "UNREAD"
  const priorityClass = PRIORITY_STYLES[notification.priority] || PRIORITY_STYLES.MEDIUM

  return (
    <article
      className={`relative rounded-xl border border-border/50 border-l-4 p-3 shadow-sm transition-all hover:shadow-md ${priorityClass} ${
        isUnread ? "ring-1 ring-primary/10" : ""
      }`}
    >
      <div className="flex gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            isUnread ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`text-sm leading-snug ${isUnread ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
              {notification.title}
            </h4>
            {isUnread ? <span className="h-2 w-2 shrink-0 rounded-full bg-primary mt-1.5" aria-hidden /> : null}
          </div>
          <p className={`mt-1 text-muted-foreground ${compact ? "text-xs line-clamp-2" : "text-sm"}`}>
            {notification.message}
          </p>

          {!compact ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {isUnread ? (
                <button
                  type="button"
                  onClick={() => onMarkRead?.(notification.id)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Mark read
                </button>
              ) : null}
              {notification.actionUrl ? (
                <a
                  href={notification.actionUrl}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  View
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => onArchive?.(notification.id)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Archive
              </button>
              <button
                type="button"
                onClick={() => onDelete?.(notification.id)}
                className="text-xs text-muted-foreground hover:text-red-600"
              >
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {notification.priority === "HIGH" && !compact ? (
        <AlertTriangle className="absolute top-3 right-3 h-3.5 w-3.5 text-red-500 opacity-40" aria-hidden />
      ) : null}
    </article>
  )
}
