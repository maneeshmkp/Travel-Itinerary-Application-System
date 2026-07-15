"use client"

import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Heart,
  Share2,
  Download,
  Loader2,
  Route,
  MessageCircle,
  Star,
} from "lucide-react"
import DestinationHeroImage from "../DestinationHeroImage"
import WeatherBadge from "../WeatherBadge"
import { formatMoney, DEFAULT_CURRENCY } from "../../utils/budgetCalculations"
import { formatTempRange } from "../../utils/weatherLogic"
import { deriveTripStatus } from "./workspaceConfig"

const STATUS_STYLES = {
  upcoming: "bg-blue-100 text-blue-700 border-blue-200",
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  completed: "bg-slate-100 text-slate-600 border-slate-200",
  planned: "bg-amber-100 text-amber-700 border-amber-200",
}

function HeroStat({ label, value }) {
  return (
    <div className="rounded-xl bg-white/70 dark:bg-white/5 backdrop-blur px-3 py-2 border border-white/40 dark:border-white/10">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground truncate">{value}</p>
    </div>
  )
}

export default function TripHero({
  itinerary,
  onBack,
  currency,
  firstDayWeather,
  saved,
  saveLoading,
  onSave,
  onShare,
  onExportPdf,
  pdfLoading,
  onOptimize,
  optimizeLoading,
  onAskAi,
  canEdit,
}) {
  const status = deriveTripStatus(itinerary)
  const budget = itinerary.budget || {}

  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-none sm:rounded-b-3xl">
        <DestinationHeroImage
          itinerary={itinerary}
          destination={itinerary.destination}
          title={itinerary.title}
          tags={itinerary.tags}
          coverImage={itinerary.coverImage}
          heightClass="h-56 sm:h-72 lg:h-80"
          roundedClass="rounded-none sm:rounded-b-3xl"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10 rounded-none sm:rounded-b-3xl" />

        <div className="absolute inset-x-0 top-0 p-4 sm:p-6">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full bg-black/30 backdrop-blur px-3 py-1.5 text-sm text-white hover:bg-black/50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                  STATUS_STYLES[status.key] || STATUS_STYLES.planned
                }`}
              >
                {status.label}
              </span>
              {itinerary.isRecommended ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-secondary/90 text-secondary-foreground">
                  <Star className="h-3 w-3 fill-current" />
                  Recommended
                </span>
              ) : null}
            </div>
            <h1 className="font-heading font-bold text-2xl sm:text-4xl text-white drop-shadow-sm">
              {itinerary.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/90">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {itinerary.destination}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {itinerary.numberOfNights} nights · {itinerary.totalDays} days
              </span>
              {itinerary.bestTimeToVisit ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {itinerary.bestTimeToVisit}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Action bar + quick stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6 relative z-10">
        <div className="bg-card border border-border/60 rounded-2xl shadow-lg p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 flex-1 min-w-0">
              <HeroStat label="Duration" value={`${itinerary.totalDays} days`} />
              <HeroStat
                label="Travelers"
                value={itinerary.travelers ? `${itinerary.travelers}` : "You"}
              />
              <HeroStat
                label="Weather"
                value={
                  firstDayWeather ? (
                    <WeatherBadge
                      condition={firstDayWeather.condition}
                      label={firstDayWeather.label}
                      temp={formatTempRange(firstDayWeather)}
                    />
                  ) : (
                    "—"
                  )
                }
              />
              <HeroStat
                label="Budget"
                value={
                  budget.max != null && budget.max !== ""
                    ? formatMoney(budget.max, budget.currency || currency || DEFAULT_CURRENCY)
                    : budget.min
                      ? formatMoney(budget.min, budget.currency || currency || DEFAULT_CURRENCY)
                      : "—"
                }
              />
              <HeroStat
                label="Activities"
                value={
                  itinerary.budgetInsight?.totalBudget
                    ? formatMoney(
                        itinerary.budgetInsight.totalBudget,
                        itinerary.budgetInsight.currency || currency || DEFAULT_CURRENCY,
                      )
                    : "—"
                }
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={saveLoading}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-60 ${
                saved
                  ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {saveLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Heart className={`h-4 w-4 ${saved ? "fill-red-500 text-red-500" : ""}`} />
              )}
              {saved ? "Saved" : "Favorite"}
            </button>

            <button
              type="button"
              onClick={onShare}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>

            <button
              type="button"
              onClick={onExportPdf}
              disabled={pdfLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-60"
            >
              {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export PDF
            </button>

            {canEdit ? (
              <button
                type="button"
                onClick={onOptimize}
                disabled={optimizeLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/30 bg-primary/5 text-primary text-sm font-medium hover:bg-primary/10 transition-colors disabled:opacity-60"
              >
                {optimizeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Route className="h-4 w-4" />}
                AI Optimize
              </button>
            ) : null}

            <button
              type="button"
              onClick={onAskAi}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity ml-auto"
            >
              <MessageCircle className="h-4 w-4" />
              Ask AI
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
