import { Bell } from "lucide-react"

export default function NotificationEmpty({ message = "You're all caught up!" }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Bell className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">{message}</p>
      <p className="mt-1 text-xs text-muted-foreground max-w-xs">
        Trip reminders, weather alerts, and budget warnings will appear here.
      </p>
    </div>
  )
}
