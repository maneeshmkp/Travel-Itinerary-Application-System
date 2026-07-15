"use client"

import { Link } from "react-router-dom"
import {
  CalendarClock,
  Cloud,
  Wallet,
  Plane,
  ShieldCheck,
  Sparkles,
  Receipt,
  Ticket,
  Bell,
  ArrowRight,
  Settings2,
  Loader2,
  Copy,
  Tag,
} from "lucide-react"
import WeatherBadge from "../../WeatherBadge"
import CollaboratePanel from "../../CollaboratePanel"
import ItineraryQuickEdit from "../../ItineraryQuickEdit"
import DownloadOfflineButton from "../../offline/DownloadOfflineButton"
import CollapsibleSection from "../CollapsibleSection"
import { formatMoney, DEFAULT_CURRENCY } from "../../../utils/budgetCalculations"
import { formatTempRange } from "../../../utils/weatherLogic"
import { categoryIcon, deriveTripStatus } from "../workspaceConfig"

function DashCard({ title, icon: Icon, action, children }) {
  return (
    <div className="bg-card border border-border/60 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </h3>
        {action}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function GoLink({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
    >
      {label}
      <ArrowRight className="h-3 w-3" />
    </button>
  )
}

export default function OverviewTab({ ctx }) {
  const {
    id,
    itinerary,
    setItinerary,
    isAuthenticated,
    canEdit,
    setActiveTab,
    forecastByDay,
    availabilityFlights,
    openAskAi,
    showSuccess,
    showError,
    publicShareUrl,
    handleCopyPublicLink,
    copyLinkLoading,
    handleRefreshCoverImage,
    coverRefreshLoading,
  } = ctx

  const currency = itinerary.budget?.currency || itinerary.budgetInsight?.currency || DEFAULT_CURRENCY
  const status = deriveTripStatus(itinerary)

  // Derive "today" (or day 1) without any backend call.
  let todayNumber = 1
  if (itinerary.startDate) {
    const start = new Date(itinerary.startDate)
    start.setHours(0, 0, 0, 0)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const diff = Math.floor((now - start) / 86400000) + 1
    todayNumber = Math.min(Math.max(diff, 1), itinerary.totalDays || itinerary.days?.length || 1)
  }
  const todayDay = itinerary.days?.find((d) => d.dayNumber === todayNumber) || itinerary.days?.[0]
  const todayWeather = forecastByDay?.get(todayDay?.dayNumber)
  const upcomingFlight = Array.isArray(availabilityFlights) && availabilityFlights.length ? availabilityFlights[0] : null
  const budget = itinerary.budget || {}

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-semibold text-xl">Overview</h2>
        <p className="text-sm text-muted-foreground">What's happening today, what needs attention, and what's next.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Today's activities */}
        <DashCard
          title={`Day ${todayDay?.dayNumber || 1} activities`}
          icon={CalendarClock}
          action={<GoLink label="Schedule" onClick={() => setActiveTab("schedule")} />}
        >
          {todayDay?.activities?.length ? (
            <ul className="space-y-2">
              {todayDay.activities.slice(0, 4).map((a) => (
                <li key={a._id} className="flex items-center gap-2 text-sm">
                  <span>{categoryIcon(a.category)}</span>
                  <span className={`truncate ${a.skipped ? "line-through text-muted-foreground" : ""}`}>{a.name}</span>
                  {a.time ? <span className="ml-auto text-xs text-muted-foreground shrink-0">{a.time}</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No activities scheduled for this day.</p>
          )}
        </DashCard>

        {/* Weather */}
        <DashCard title="Current weather" icon={Cloud}>
          {todayWeather ? (
            <div className="space-y-2">
              <WeatherBadge condition={todayWeather.condition} label={todayWeather.label} temp={formatTempRange(todayWeather)} />
              <div className="grid grid-cols-3 gap-2 pt-1">
                {Array.from(forecastByDay?.entries() || [])
                  .slice(0, 3)
                  .map(([dayNum, w]) => (
                    <div key={dayNum} className="rounded-lg bg-muted/50 p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">Day {dayNum}</p>
                      <p className="text-xs font-medium">{w.condition}</p>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Forecast not available yet.</p>
          )}
        </DashCard>

        {/* Budget summary */}
        <DashCard
          title="Budget summary"
          icon={Wallet}
          action={<GoLink label="Finance" onClick={() => setActiveTab("finance")} />}
        >
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Planned</span>
              <span className="font-medium">
                {budget.max != null && budget.max !== ""
                  ? formatMoney(budget.max, budget.currency || currency)
                  : budget.min
                    ? formatMoney(budget.min, budget.currency || currency)
                    : "—"}
              </span>
            </div>
            {itinerary.budgetInsight?.totalBudget ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Activities est.</span>
                <span className="font-medium">
                  {formatMoney(itinerary.budgetInsight.totalBudget, itinerary.budgetInsight.currency || currency)}
                </span>
              </div>
            ) : null}
            {itinerary.budgetInsight?.costPerDay ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg / day</span>
                <span className="font-medium">
                  {formatMoney(itinerary.budgetInsight.costPerDay, itinerary.budgetInsight.currency || currency)}
                </span>
              </div>
            ) : null}
          </div>
        </DashCard>

        {/* Upcoming flight */}
        <DashCard
          title="Upcoming flight"
          icon={Plane}
          action={<GoLink label="Transport" onClick={() => setActiveTab("transport")} />}
        >
          {upcomingFlight ? (
            <div className="text-sm">
              <p className="font-medium">{upcomingFlight.airline || upcomingFlight.name || "Flight option"}</p>
              <p className="text-muted-foreground">
                {upcomingFlight.from || itinerary.destination}
                {upcomingFlight.to ? ` → ${upcomingFlight.to}` : ""}
              </p>
              {upcomingFlight.price != null ? (
                <p className="mt-1 font-semibold">{formatMoney(upcomingFlight.price, upcomingFlight.currency || currency)}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No flights detected. <button type="button" onClick={() => setActiveTab("transport")} className="text-primary hover:underline">Explore transport</button>.
            </p>
          )}
        </DashCard>

        {/* Trip health */}
        <DashCard
          title="Trip health"
          icon={ShieldCheck}
          action={<GoLink label="AI" onClick={() => setActiveTab("ai")} />}
        >
          <p className="text-sm text-muted-foreground">
            Run AI Risk Detection to score weather, budget, documents, bookings and schedule conflicts.
          </p>
          <span className={`inline-block mt-2 text-xs font-semibold px-2.5 py-1 rounded-full border ${
            status.key === "completed"
              ? "bg-slate-100 text-slate-600 border-slate-200"
              : "bg-emerald-50 text-emerald-700 border-emerald-200"
          }`}>
            {status.label}
          </span>
        </DashCard>

        {/* Recent expenses */}
        <DashCard
          title="Recent expenses"
          icon={Receipt}
          action={<GoLink label="Finance" onClick={() => setActiveTab("finance")} />}
        >
          <p className="text-sm text-muted-foreground">Track and categorize spending, then export CSV/PDF from Finance.</p>
        </DashCard>

        {/* Upcoming booking */}
        <DashCard
          title="Bookings"
          icon={Ticket}
          action={<GoLink label="Bookings" onClick={() => setActiveTab("bookings")} />}
        >
          <p className="text-sm text-muted-foreground">Manage hotels, flights and restaurants with status and calendar sync.</p>
        </DashCard>

        {/* Notifications / alerts */}
        <DashCard
          title="Notifications"
          icon={Bell}
          action={
            <Link to="/notifications" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          <p className="text-sm text-muted-foreground">Flight, budget and document alerts appear here and in your notification center.</p>
        </DashCard>
      </div>

      {/* Quick AI suggestions */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5 p-5">
        <h3 className="font-heading font-semibold text-sm flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          Quick AI suggestions
        </h3>
        <div className="flex flex-wrap gap-2">
          {["What should I do today?", "Is my trip safe?", "How can I save money?", "Optimize my schedule"].map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => openAskAi(q)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:border-primary/40 hover:text-primary transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Trip tools (edit / collaborate / export) */}
      <CollapsibleSection
        title="Trip tools"
        description="Edit details, invite collaborators, and export or share."
        icon={Settings2}
        defaultOpen={false}
        allowFullscreen={false}
      >
        <div className="space-y-4">
          <ItineraryQuickEdit
            itinerary={itinerary}
            canEdit={canEdit}
            onSaved={(data) => setItinerary(data)}
            showSuccess={showSuccess}
            showError={showError}
          />
          <CollaboratePanel
            itineraryId={id}
            collaboration={itinerary?.collaboration}
            isAuthenticated={isAuthenticated}
            onUpdated={(collab) => setItinerary((prev) => (prev ? { ...prev, collaboration: collab } : prev))}
            showSuccess={showSuccess}
            showError={showError}
          />
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <DownloadOfflineButton tripId={itinerary._id} className="w-full justify-center py-2.5 text-sm" />
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={publicShareUrl}
                className="flex-1 min-w-0 text-xs px-3 py-2 rounded-lg border border-border bg-background text-muted-foreground truncate"
                aria-label="Public itinerary link"
              />
              <button
                type="button"
                onClick={handleCopyPublicLink}
                disabled={copyLinkLoading || !publicShareUrl}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted/50 disabled:opacity-60 shrink-0"
              >
                {copyLinkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                <span className="hidden sm:inline">Copy</span>
              </button>
            </div>
            <button
              type="button"
              onClick={handleRefreshCoverImage}
              disabled={coverRefreshLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted/50 disabled:opacity-60"
            >
              {coverRefreshLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
              Refresh cover image
            </button>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  )
}
