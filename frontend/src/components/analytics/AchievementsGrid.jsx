"use client"

export default function AchievementsGrid({ achievements = [] }) {
  if (!achievements.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Complete trips and explore destinations to unlock achievements.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {achievements.map((a) => (
        <div
          key={a.id}
          className="rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900 p-3 text-center"
        >
          <p className="text-2xl">{a.icon || "🏅"}</p>
          <p className="text-xs font-semibold mt-1">{a.title}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{a.description}</p>
        </div>
      ))}
    </div>
  )
}
