"use client"

import { useEffect } from "react"
import { BarChart3, Download, FileText, Loader2, RefreshCw } from "lucide-react"
import { useTravelAnalytics } from "../hooks/useTravelAnalytics"
import TravelScoreCard from "../components/analytics/TravelScoreCard"
import StatisticsCards from "../components/analytics/StatisticsCards"
import AnalyticsCharts from "../components/analytics/AnalyticsCharts"
import TravelHeatMap from "../components/analytics/TravelHeatMap"
import TravelTimeline from "../components/analytics/TravelTimeline"
import AchievementsGrid from "../components/analytics/AchievementsGrid"
import InsightsCard from "../components/analytics/InsightsCard"
import YearComparisonCard from "../components/analytics/YearComparisonCard"
import { DEFAULT_CURRENCY } from "../utils/budgetCalculations"

const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i)

export default function TravelAnalyticsPage() {
  const {
    report,
    exists,
    stats,
    charts,
    heatmap,
    timeline,
    achievements,
    insights,
    aiRecommendations,
    yearComparison,
    travelScore,
    travelScoreLabel,
    loading,
    recalculating,
    error,
    selectedYear,
    setSelectedYear,
    recalculate,
    exportCsv,
    exportPdf,
  } = useTravelAnalytics()

  useEffect(() => {
    if (!loading && report && !exists && !recalculating) {
      recalculate(false).catch(() => {})
    }
  }, [loading, report, exists, recalculating, recalculate])

  const currency = report?.currency || DEFAULT_CURRENCY

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" />
            Travel Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your personal travel story — stats, insights, and achievements like Spotify Wrapped.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => exportCsv(selectedYear)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border text-sm hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button
            type="button"
            onClick={() => exportPdf(selectedYear)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border text-sm hover:bg-muted"
          >
            <FileText className="h-4 w-4" />
            PDF
          </button>
          <button
            type="button"
            onClick={() => recalculate(true)}
            disabled={recalculating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
          >
            {recalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading && !report ? (
        <div className="h-40 rounded-lg bg-muted/50 animate-pulse" />
      ) : null}

      {!loading && !exists && !recalculating ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <BarChart3 className="h-12 w-12 text-primary mx-auto opacity-70" />
          <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">
            Create trips to build your travel analytics. Click Refresh to generate your first report.
          </p>
        </div>
      ) : null}

      {(exists || recalculating) && stats ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <TravelScoreCard score={travelScore} label={travelScoreLabel} />
            <div className="lg:col-span-2 rounded-lg border border-border bg-card p-4 text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Favorite destination:</span>{" "}
                <strong>{stats.favoriteDestination || "—"}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Favorite country:</span>{" "}
                <strong>{stats.favoriteCountry || "—"}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Favorite category:</span>{" "}
                <strong>{stats.favoriteCategory || "—"}</strong>
              </p>
              {stats.mostExpensiveTrip ? (
                <p>
                  <span className="text-muted-foreground">Most expensive:</span> {stats.mostExpensiveTrip.title}
                </p>
              ) : null}
              {stats.longestTrip ? (
                <p>
                  <span className="text-muted-foreground">Longest trip:</span> {stats.longestTrip.title} (
                  {stats.longestTrip.totalDays} days)
                </p>
              ) : null}
            </div>
          </div>

          <StatisticsCards stats={stats} currency={currency} />
          <InsightsCard insights={insights} recommendations={aiRecommendations} currency={currency} />
          <YearComparisonCard comparison={yearComparison} />
          <AnalyticsCharts charts={charts} currency={currency} />
          <TravelHeatMap heatmap={heatmap} />
          <TravelTimeline timeline={timeline} />

          <div>
            <p className="text-sm font-semibold mb-3">Achievements</p>
            <AchievementsGrid achievements={achievements} />
          </div>
        </>
      ) : null}
    </div>
  )
}
