# AI Budget Optimizer

Intelligent trip cost analysis and savings recommendations — similar to Google Travel, Hopper, Kayak, and Expedia budget tools.

## Architecture

```
POST /api/budget/analyze
        │
        ▼
budgetOptimizerService.analyzeTripBudget()
        │
        ├── assertTripAccess (itineraryAccess)
        ├── buildBudgetContext
        │     ├── buildExpenseReport (planned vs actual)
        │     ├── Booking.find (hotels, flights)
        │     ├── activities from itinerary days
        │     └── weather forecast
        │
        ├── optimizationEngine.runRuleBasedOptimization()
        │     └── priceComparison.buildPriceComparisons()
        │
        ├── aiBudget.budgetOptimizerAIService.analyzeBudgetWithAI()
        │     └── llmChatJson (Gemini → OpenAI → demo)
        │
        ├── budgetCalculator (health score, charts, category breakdown)
        └── BudgetOptimization model (persist + cache by analysisHash)
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/budget/analyze` | Analyze itinerary (`{ tripId, force? }`) |
| `GET` | `/api/budget/:tripId` | Get saved optimization + expense integration |
| `POST` | `/api/budget/apply` | Accept/reject recommendations (`{ tripId, recommendationIds, rejectIds }`) |
| `POST` | `/api/budget/simulate` | What-if simulator (`{ tripId, changes }`) |
| `POST` | `/api/ai/budget-query` | Budget copilot Q&A |

All routes are JWT protected. Users only access their own trips (owner, collaborator, or ownerless seeded trips).

## Database: BudgetOptimization

One document per user per trip (`userId` + `tripId` unique).

| Field | Purpose |
|-------|---------|
| `currentBudget` | Planned trip total |
| `optimizedBudget` | After applying savings |
| `potentialSavings` | Difference |
| `recommendations[]` | AI + rule suggestions with reason, savings, impact, difficulty |
| `acceptedRecommendations[]` | IDs user accepted |
| `comparisons[]` | Price comparison table rows |
| `categoryBreakdown[]` | Per-category current / optimized / savings |
| `healthScore` / `healthLabel` | Budget health 0–100 |
| `charts` | Chart data for UI |
| `analysisHash` | Skip re-analysis when itinerary unchanged (15 min cache) |

## Optimization Algorithm

### Phase 1 — Rule engine (`optimizationEngine.js`)

1. **Budget threshold** — if spending ≥ 85% or over budget, flag high-impact cuts.
2. **Price comparisons** — hotels, flights, paid activities, transport, dining from bookings + expense categories.
3. **Weather** — rain days → swap outdoor paid activities for indoor/free options.
4. **Transport** — if transport planned > threshold, suggest metro (+45% savings estimate).
5. **Hotels** — if hotel booking exists, suggest ~22% cheaper nearby stay.

### Phase 2 — AI merge (`budgetOptimizerAIService.js`)

- Sends clipped JSON context to `llmChatJson`.
- AI returns structured recommendations + `updatedItinerary` day changes.
- Merges with rule engine output (deduplicates by title).
- Demo fallback when no API keys.

### Phase 3 — Persist & notify

- Upserts `BudgetOptimization`.
- Notifies if savings ≥ 1000 or budget exceeded.

## Budget Health Score (0–100)

Computed in `budgetCalculator.computeBudgetHealthScore()`:

| Factor | Effect |
|--------|--------|
| Budget % used | −6 to −25 |
| Over-budget categories | −4 each (max −15) |
| Transport share > 35% | −10 |
| Free activity ratio < 10% | −8 |
| Luxury ratio (shopping + entertainment) > 25% | −8 |

Labels: **Excellent** (≥85), **Good** (≥70), **Average** (≥50), **Poor** (<50).

## Recommendation Engine

Each recommendation includes:

- `reason` — why it saves money
- `estimatedSavings` — amount in trip currency
- `impact` — low / medium / high
- `difficulty` — easy / medium / hard
- `currentPrice` / `suggestedPrice`
- `alternative` — name, location, Google Maps URL

**Apply flow:** Accepting a recommendation updates activity `cost` when `activityId` is set, marks status `accepted`, and recalculates `optimizedBudget`.

## Expense Tracker Integration

`GET /api/budget/:tripId` merges live `buildExpenseReport()` data:

- Planned vs actual vs optimized
- Category breakdown from expenses
- Warning level (approaching / almost / exhausted / over)

## What-If Simulator

`POST /api/budget/simulate` accepts:

```json
{
  "tripId": "...",
  "changes": {
    "hotelPrice": 8000,
    "flightPrice": 12000,
    "transportMode": "metro",
    "extraSavings": 500
  }
}
```

Returns `simulatedBudget`, `savings`, `delta` without persisting.

## Notifications

| Type | When |
|------|------|
| `BUDGET_SAVINGS_AVAILABLE` | Potential savings ≥ 1000 |
| `BUDGET_WARNING` | Budget exceeded during analysis |

## Frontend

- **Hook:** `useBudgetOptimizer`
- **Panel:** `BudgetTripPanel` at `#budget` on itinerary detail
- **Components:** SavingsCard, BudgetHealthCard, BudgetCharts, ComparisonTable, RecommendationCard, OptimizationTimeline, WhatIfSimulator, BudgetCopilot

## Testing

### 1. Analyze itinerary

1. Open a trip with budget, activities, and optional bookings.
2. Scroll to **AI Budget Optimizer** (`#budget`).
3. Click **Analyze budget**.
4. Verify: health score, savings card, charts, comparisons, recommendations.

### 2. Accept / reject recommendation

1. Click **Accept** on a transport or activity suggestion.
2. Verify status changes to `accepted` and optimized total updates.
3. Click **Reject** on another — status becomes `rejected`.

### 3. What-if simulator

1. Select **Switch to metro**, enter a lower hotel price.
2. Click **Calculate**.
3. Verify simulated total and savings appear.

### 4. Expense integration

1. Add expenses in Expense Tracker.
2. Re-analyze budget.
3. Verify planned / actual shown in Budget Health card.

### 5. Charts

1. After analysis, confirm bar charts: current vs optimized, category breakdown, forecast line.

### 6. Copilot

1. Ask: "How can I save money?"
2. Verify AI or demo answer references top recommendation.

### 7. Notifications

1. Analyze a trip with high planned budget.
2. Check notifications for savings alert (if savings ≥ 1000).

### 8. Cache

1. Analyze once, then analyze again without `force` — should return cached result within 15 minutes.
2. Use `{ force: true }` or change itinerary to trigger re-analysis.

## Environment

Uses existing `GEMINI_API_KEY` / `OPENAI_API_KEY` for AI. Google Maps links use destination search URLs (no extra keys required for comparisons).

## Modified / New Files

### Backend

| File | Role |
|------|------|
| `constants/budgetOptimization.js` | Categories, difficulty, health labels |
| `models/BudgetOptimization.js` | Persistence |
| `utils/budgetCalculator.js` | Health score, charts, serialization |
| `services/priceComparison.js` | Hotel/activity/transport comparisons |
| `services/optimizationEngine.js` | Rule-based recommendations |
| `services/aiBudget/budgetOptimizerAIService.js` | LLM analysis |
| `services/budgetOptimizer/budgetOptimizerService.js` | Orchestration |
| `controllers/budgetOptimizer/budgetOptimizerController.js` | HTTP handlers |
| `routes/budgetOptimizer.js` | Routes |
| `app.js` | Mount `/api/budget` |
| `constants/notificationTypes.js` | New budget notification types |
| `services/notifications/notificationTriggers.js` | `notifyBudgetOptimization` |
| `services/aiService.js` | `aiBudgetQuery` |
| `controllers/aiController.js` | `budgetQuery` |
| `routes/aiRoutes.js` | `/budget-query` |

### Frontend

| File | Role |
|------|------|
| `constants/budgetOptimization.js` | UI labels and colors |
| `hooks/useBudgetOptimizer.js` | State + API |
| `services/api.js` | `budgetAPI` |
| `components/budget/*` | Dashboard UI |
| `pages/ItineraryDetail.jsx` | `#budget` section |
