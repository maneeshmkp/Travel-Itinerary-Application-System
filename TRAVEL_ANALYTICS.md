# Personal Travel Analytics Dashboard

Spotify Wrapped-style travel statistics across all your trips — scores, charts, heatmap, timeline, achievements, and AI recommendations.

## Architecture

```
GET /api/analytics/dashboard
POST /api/analytics/recalculate
        │
        ▼
travelAnalyticsService
        │
        ├── statisticsEngine.computeUserStatistics()
        │     ├── Itinerary (owner trips + activities)
        │     ├── TripExpense, Booking, Review
        │     ├── PackingList, BudgetOptimization
        │     └── travelCalculator (geo, distance, score)
        │
        ├── travelInsights.generateAIInsights()
        │     └── llmChatJson + rule-based insights
        │
        └── TravelAnalytics model (persist + 15 min cache)
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/analytics/dashboard` | Main dashboard (cached snapshot) |
| `GET` | `/api/analytics/year/:year` | Yearly filtered report |
| `GET` | `/api/analytics/month/:month` | Monthly report (`YYYY-MM`) |
| `GET` | `/api/analytics/travel-score` | Travel score only |
| `POST` | `/api/analytics/recalculate` | Rebuild analytics (`{ force? }`) |
| `GET` | `/api/analytics/export/csv` | CSV export (`?year=2025`) |
| `GET` | `/api/analytics/export/pdf` | PDF report (`?year=2025`) |

All personal analytics routes require JWT. Users only see data from trips they own (`ownerId`).

`POST /api/analytics/booking-click` remains public (partner click tracking).

## Database: TravelAnalytics

One document per user (`userId` unique).

Stores aggregated metrics, charts, heatmap, timeline, achievements, insights, and `analysisHash` for cache invalidation.

## Analytics Engine

### Data sources

| Source | Metrics |
|--------|---------|
| **Itinerary** | Trips, days, destinations, tags, budget |
| **TripExpense** | Total spent, actual per trip, monthly spend |
| **Booking** | Trip status (cancelled), flight counts |
| **Review** | Average rating given |
| **PackingList** | Packing completion % |
| **BudgetOptimization** | Money saved, budget health |

### Trip status (derived)

No `status` field on Itinerary — computed in `deriveTripStatus()`:

- **cancelled** — all bookings for trip are cancelled
- **completed** — `startDate + totalDays` in the past
- **upcoming** — `startDate` in the future
- **active** — currently in progress
- **planned** — no start date

### Geo parsing

`parseGeoFromDestination()` uses `normalizeDestination()` + country/region regex (India, Thailand, UAE, etc.).

Heatmap entries include coordinates from `lookupDestinationCoordinates()`.

### Distance

Sum of haversine km between consecutive geocoded activities per trip.

## Travel Score (0–100)

`computeTravelScore()` in `travelCalculator.js`:

| Factor | Max points |
|--------|------------|
| Trip completion rate | +20 |
| Budget health (from Budget Optimizer) | +15 |
| Average review rating | +10 |
| Packing completion | +10 |
| Destination diversity (countries) | +10 |
| Review engagement (3+ reviews) | +5 |
| AI savings | +3 to +5 |
| Base | 50 |

**Labels:** Excellent (≥90) · Very Good (≥75) · Good (≥60) · Needs Improvement (<60)

## Achievement System

Unlocked in `statisticsEngine.computeAchievements()`:

| Badge | Condition |
|-------|-----------|
| First Trip | ≥1 trip |
| Adventure Lover | 3+ adventure-tagged trips |
| Beach Explorer | 1+ beach trip |
| Budget Master | avg budget health ≥80 |
| Weekend Traveller | 2+ trips ≤3 days |
| International Traveller | non-India country |
| Explorer Level 10 | 10+ cities |
| Frequent Flyer | 5+ flight bookings |
| Packing Pro | 80%+ packing on a trip |
| Reviewer | 3+ reviews |

## AI Recommendation Engine

1. **Rule insights** — spending patterns, savings, duration, preferences
2. **LLM merge** — `generateAIInsights()` via `llmChatJson`
3. **Output** — `nextDestination`, `bestMonth`, `estimatedBudget`, `recommendedDuration`, `activities`

## Charts (Recharts)

Pre-computed in `buildCharts()`:

- Trips per month
- Money spent (line)
- Budget vs actual (bar)
- Countries visited (pie)
- Categories / activities (bar)
- Travel days by month
- AI savings over time

## Heatmap

Leaflet `CircleMarker` map — radius and color scale by visit count. Fallback chips list when coordinates unavailable.

## Notifications

`TRAVEL_MILESTONE` — fired when city count crosses 5, 10, 25, or 50 (e.g. "You visited your 10th city").

## Frontend

- **Page:** `/analytics` (`TravelAnalyticsPage`)
- **Nav:** Analytics link in navbar
- **Hook:** `useTravelAnalytics`
- **Components:** `TravelScoreCard`, `StatisticsCards`, `AnalyticsCharts`, `TravelHeatMap`, `TravelTimeline`, `AchievementsGrid`, `InsightsCard`, `YearComparisonCard`

## Testing

| Feature | Steps |
|---------|-------|
| **Dashboard** | Login → `/analytics` → auto-build or click Refresh |
| **Travel score** | Verify 0–100 score and label after recalculate |
| **Statistics** | Create trips with destinations, expenses, bookings |
| **Charts** | Confirm bar/line/pie charts render |
| **Heatmap** | Trips with known destinations show map markers |
| **Timeline** | Chronological trip list by year |
| **Achievements** | Complete conditions (e.g. 3 adventure trips) → refresh |
| **AI insights** | Check insight bullets + next destination card |
| **Year comparison** | Compare current vs previous year table |
| **Export CSV/PDF** | Click CSV / PDF buttons |
| **Milestones** | Reach 10 cities → check notifications |
| **Year report** | `GET /api/analytics/year/2025` |
| **Cache** | Refresh twice without trip changes → fast response; use `force: true` to rebuild |

## Modified / New Files

### Backend

| File | Role |
|------|------|
| `constants/travelAnalytics.js` | Score labels, achievement metadata |
| `models/TravelAnalytics.js` | Persistence |
| `utils/travelCalculator.js` | Geo, distance, score, heatmap, timeline |
| `services/statisticsEngine.js` | Aggregation engine |
| `services/travelInsights.js` | Rule + AI insights |
| `services/travelAnalytics/travelAnalyticsService.js` | Orchestration, cache |
| `services/travelAnalytics/analyticsExportService.js` | PDF/CSV |
| `controllers/analytics/travelAnalyticsController.js` | HTTP handlers |
| `routes/analyticsRoutes.js` | Extended routes |
| `constants/notificationTypes.js` | `TRAVEL_MILESTONE` |
| `services/notifications/notificationTriggers.js` | `notifyTravelMilestone` |

### Frontend

| File | Role |
|------|------|
| `constants/travelAnalytics.js` | UI helpers |
| `hooks/useTravelAnalytics.js` | State + API |
| `services/api.js` | `travelAnalyticsAPI` |
| `components/analytics/*` | Dashboard UI |
| `pages/TravelAnalyticsPage.jsx` | Main page |
| `App.jsx`, `Navbar.jsx` | Route + nav link |
