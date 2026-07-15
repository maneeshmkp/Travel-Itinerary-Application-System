# AI Travel Risk Detection & Smart Replanning

Proactive trip monitoring that detects weather, booking, budget, document, and schedule risks — then recommends (and optionally applies) AI-powered day-level replans.

## Architecture

```
Context builder (trip, weather, bookings, docs, budget, calendar)
        ↓
Rule-based detectors (weatherRisk, budgetRisk, documentRisk, scheduleOptimizer, bookingRisk)
        ↓
AI enrichment (riskAIService — merge, reasoning, replan)
        ↓
TripRisk documents (MongoDB) + notifications + Trip Health Score
```

## Database — `TripRisk`

**Model:** `backend/models/TripRisk.js`

| Field | Description |
|-------|-------------|
| `userId`, `tripId` | Owner + trip (unique `dedupKey` per user/trip) |
| `riskType` | e.g. `heavy_rain`, `flight_delay`, `budget_exceeded` |
| `severity` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `status` | `OPEN`, `RESOLVED`, `IGNORED` |
| `title`, `description` | Human-readable risk |
| `recommendation` | AI suggestions, alternatives, transport tips |
| `affectedDay` | Day number (1-based) |
| `source` | `weather`, `booking`, `document`, `budget`, `schedule`, `ai`, `calendar` |
| `dedupKey` | Prevents duplicate risks on re-analyze |

## API (JWT)

| Method | Route | Body / params |
|--------|-------|----------------|
| POST | `/api/risk/analyze` | `{ tripId, force? }` |
| GET | `/api/risk/:tripId` | List risks + health score |
| POST | `/api/risk/replan` | `{ tripId, riskId?, dayNumber?, apply? }` |
| POST | `/api/risk/resolve/:id` | `{ status: RESOLVED \| IGNORED }` |
| POST | `/api/ai/risk-query` | `{ tripId, question }` — copilot |

## Risk Detection Engine

### Weather (`weatherRisk.js`)

OpenWeather forecast → rain, storm, heat, snow, cyclone risks with indoor alternatives (museum, mall, aquarium, restaurant).

### Bookings (`riskDetection/bookingRisk.js`)

- Flight delay / cancellation status
- Hotel check-in too close to arrival
- Missing ground transport after flight

### Documents (`documentRisk.js`)

- Missing vault documents per trip
- Passport expiring within 6 months
- Visa expiring within 30 days

### Budget (`budgetRisk.js`)

- Over budget or >85% used → cheaper hotel, free attractions, public transport tips

### Schedule (`scheduleOptimizer.js`)

- Overlapping activity times
- Long travel segments (haversine distance)
- Traffic / congestion warnings
- Late-night activities
- Route order optimization hints

### Calendar

Duplicate events from `buildTripCalendarEvents`.

## AI prompt design

**Analyze** (`riskAIService.analyzeRisksWithAI`):

- System: PackPoint/TripIt-style analyst; **JSON only**
- Output: `{ severity, risks[], recommendations[], updatedSchedule[], reasoning[] }`
- User: rule-based risks + full clipped context
- Merges with detectors; deduplicates by `dedupKey`

**Replan** (`replanDayWithAI`):

- Regenerates **one day only** — never the full trip
- Returns `updatedSchedule` with activity `reason` fields
- `apply: true` skips old day activities and inserts geocoded replacements

## Trip Health Score (0–100)

**Function:** `computeHealthScore()` in `riskHelpers.js`

| Factor | Deduction |
|--------|-----------|
| CRITICAL risk | −25 |
| HIGH | −15 |
| MEDIUM | −8 |
| LOW | −3 |
| Budget exceeded | −12 |
| Missing documents | −10 |
| Weather alerts | −8 |
| Schedule conflicts | −10 |

| Score | Label |
|-------|-------|
| 85–100 | Excellent |
| 70–84 | Good |
| 50–69 | Average |
| 0–49 | Poor |

## Replanning algorithm

1. User clicks **Replan** on a risk card (or API with `riskId` / `dayNumber`)
2. Load trip day + risk context + weather for that day
3. `replanDayWithAI` returns proposed activities with times and reasons
4. UI shows **Before vs After** in `ReplanCompare`
5. **Apply** → mark existing day activities `skipped: true`, create new geocoded activities, update `Day.activities`

Uses existing `geocodeActivityFields` and `persistItineraryBudgetTotals`.

## Notifications

- `TRAVEL_RISK_ALERT` — HIGH/CRITICAL risks on analyze
- `SCHEDULE_CONFLICT` — type registered for scheduler extensions
- Scheduler: `runRiskAnalysisReminders()` re-analyzes trips starting within 14 days

## Performance

- **15-minute** in-memory cache keyed by `analysisHash` (destination, weather, activities, budget)
- Weather reused from `getWeatherForecast` cache
- Re-analyze skipped if context unchanged unless `force: true`

## Frontend

| File | Role |
|------|------|
| `hooks/useTravelRisk.js` | analyze, resolve, replan, copilot |
| `components/risk/RiskTripPanel.jsx` | Main dashboard |
| `components/risk/TripHealthCard.jsx` | 0–100 score |
| `components/risk/RiskCard.jsx` | Severity badge, resolve, ignore, replan |
| `components/risk/ReplanCompare.jsx` | Proposed day timeline |
| `components/risk/RiskCopilot.jsx` | “Is my trip safe?” etc. |

Integrated at `#risks` on itinerary detail (after packing).

## How to test

### 1. Analyze trip

1. Open trip → **Trip Health & Risk Detection**
2. Click **Analyze trip**
3. Verify health score + risk cards

### 2. Heavy rain

- Trip to rainy destination / monsoon dates
- Expect `heavy_rain` with museum/mall alternatives

### 3. Budget exceeded

- Log expenses over budget via expense tracker
- Re-analyze → `budget_exceeded` risk

### 4. Passport expiring

- Upload passport with expiry within 6 months
- Re-analyze → `passport_expiring`

### 5. Missing insurance

- International trip without insurance in vault
- Re-analyze → `missing_documents`

### 6. Overlapping activities

- Two activities same day with overlapping times
- Re-analyze → `overlapping_activities`

### 7. Replan day

1. Click **Replan** on a weather risk
2. Review proposed schedule
3. **Apply changes** → refresh itinerary

### 8. Resolve / Ignore

- **Resolve** → status `RESOLVED`, removed from OPEN filter
- **Ignore** → status `IGNORED`

### 9. Copilot

Ask: “Is my trip safe?”, “What should I change?”, “Why did AI recommend this?”

### 10. Notifications

- Trigger HIGH risk → notification with link to `#risks`
- Or run notification scheduler manually

### API smoke test

```bash
curl -X POST http://localhost:5000/api/risk/analyze \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"tripId":"YOUR_TRIP_ID"}'

curl http://localhost:5000/api/risk/YOUR_TRIP_ID \
  -H "Authorization: Bearer $TOKEN"
```

## Environment

Uses existing keys: `GEMINI_API_KEY`, `OPENAI_API_KEY`, `OPENWEATHER_API_KEY`. No new env vars required.
