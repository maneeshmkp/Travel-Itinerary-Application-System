# AI Packing Assistant

Intelligent, destination-specific packing lists integrated with weather forecasts, itinerary activities, bookings, and the document vault — similar to PackPoint and Google Travel.

## Database schema

**Model:** `PackingList` (`backend/models/PackingList.js`)

| Field | Type | Notes |
|-------|------|-------|
| `userId` | ObjectId | Owner (indexed) |
| `tripId` | ObjectId | Linked trip (indexed) |
| `generatedByAI` | boolean | False when demo fallback used |
| `travelStyle` | string | solo, family, couple, business, adventure |
| `categories` | object | 10 category arrays of packing items |
| `completedItems` | string[] | IDs of packed items |
| `customItems` | array | User-added items |
| `estimatedWeight` | number | Total kg |
| `weightByCategory` | Map | Per-category kg breakdown |
| `baggageAllowanceKg` | number | From flight booking or default 23 |
| `insights` | string[] | AI + weather tips |
| `notes` | string | AI summary |
| `generationHash` | string | Dedup key — skips regen if context unchanged |

**Indexes:** `{ userId, tripId }` unique, `{ tripId }`.

### Packing item shape

Each item in `categories` or `customItems`:

| Field | Description |
|-------|-------------|
| `id` | UUID |
| `name` | Item label |
| `category` | One of 10 packing categories |
| `packed` | Checkbox state |
| `quantity`, `weightKg` | For weight estimation |
| `essential` | Highlight in reminders |
| `source` | ai, custom, weather, activity, document, booking |
| `missing` | True when linked document not in vault |
| `travelerId`, `shared` | Collaboration hooks |

## API (JWT protected)

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/packing/generate` | `{ tripId }` — generate list |
| POST | `/api/packing/regenerate` | `{ tripId }` — force regenerate, preserve packed state |
| GET | `/api/packing/:tripId` | Get list + progress |
| PUT | `/api/packing/item/:id` | `{ tripId, packed?, name?, quantity?, notes? }` |
| POST | `/api/packing/custom` | `{ tripId, name, category?, weightKg? }` |
| DELETE | `/api/packing/item/:id?tripId=` | Remove item |
| GET | `/api/packing/:tripId/search` | `?q=&packed=&category=&missing=` |
| GET | `/api/packing/:tripId/export/pdf` | PDF checklist |
| GET | `/api/packing/:tripId/export/csv` | CSV export |

## AI prompt design

**Service:** `backend/services/packingAI/packingAIService.js`

The system prompt instructs the model to act as a PackPoint-style assistant and return **only JSON** (no markdown) with this shape:

```json
{
  "clothing": [{"name":"item","quantity":1,"weightKg":0.3,"essential":true}],
  "electronics": [],
  "documents": [],
  "medicines": [],
  "toiletries": [],
  "accessories": [],
  "photography": [],
  "emergency_kit": [],
  "food": [],
  "miscellaneous": [],
  "insights": ["short tip"],
  "notes": "one sentence summary"
}
```

**User message** includes clipped context from `buildPackingContext()`:

- Destination, country, season (month), trip duration
- Weather forecast summary
- Activities from itinerary days
- Travel style (inferred from tags/budget)
- Budget, baggage allowance, missing documents

**Fallback:** If no `GEMINI_API_KEY` / `OPENAI_API_KEY`, `demoPackingList()` returns destination-aware items (e.g. Goa → rain gear, Manali → winter layers).

**Dedup:** `generationHash` compares destination, days, start date, tags, weather summary, and activity names. Unchanged context returns cached list unless `regenerate` is called.

## Weather integration

**Service:** `backend/services/weatherPacking.js`

1. `getWeatherForecast()` fetches OpenWeather data (or demo) per trip dates
2. `weatherPackingItems()` scans each day:
   - Rain/storm → raincoat, umbrella, quick-dry clothes
   - Cold (min &lt; 10°C) → winter jacket, gloves, thermal wear
   - Hot (max &gt; 32°C) → sunscreen, cap, light clothes
3. Insights appended (e.g. "Heavy rain expected — pack umbrella")

Items merge into categories with `source: "weather"`.

## Activity integration

**Helper:** `activityPackingItems()` in `packingHelpers.js`

Keyword matching on itinerary activity names/categories:

| Activity | Items added |
|----------|-------------|
| Trek / hike | Hiking shoes, water bottle, energy bars, rain jacket |
| Beach / swim | Swimsuit, sunglasses, beach towel, sunscreen |
| Ski / snow | Thermal wear, snow boots, lip balm |

## Document vault integration

`documentPackingItems()` adds passport, visa, insurance, tickets to the documents category. Items with `missing: true` when `getMissingDocuments()` reports gaps.

## Booking integration

Flight bookings on the trip set `baggageAllowanceKg` (parsed from booking notes `XXkg`, default 23 kg). `baggageWarning()` adds an insight when estimated weight exceeds allowance.

## Weight estimation

**Service:** `backend/services/weightEstimator.js`

Default per-item weights by category when AI omits `weightKg`:

| Category | Default kg/item |
|----------|-----------------|
| Clothing | 0.4 |
| Electronics | 0.5 |
| Documents | 0.1 |
| Toiletries | 0.2 |
| Accessories | 0.15 |
| … | … |

`estimatePackingWeight()` sums `quantity × weightKg` per category and total. Recalculated on pack/unpack, add/delete custom items.

## Checklist flow

1. User opens trip → **Packing** section (`#packing`)
2. Clicks **Generate list** → AI + weather + activities + documents merged
3. Items shown by category with checkboxes (packed / not packed / missing doc warning)
4. Progress card shows `packed / total` percentage
5. Custom items via **Add custom item**
6. Search/filter by name, status, category
7. Export PDF or CSV

## Notifications

**Type:** `PACKING_REMINDER`

`runPackingReminders()` runs with the notification scheduler (every 15 min):

- **3 days before** trip start (0–3 days window)
- No list → "Generate your packing list"
- Unpacked essential / missing document → "You haven't packed your passport"

Action URL: `/itineraries/:tripId#packing`

## Frontend

| Path | Purpose |
|------|---------|
| `hooks/usePacking.js` | API state + CRUD |
| `components/packing/PackingTripPanel.jsx` | Main dashboard |
| `components/packing/PackingProgressCard.jsx` | % packed |
| `components/packing/PackingWeightCard.jsx` | Weight + allowance warning |
| `components/packing/PackingInsights.jsx` | AI tips |
| `components/packing/PackingTimeline.jsx` | Days until departure |
| `components/packing/PackingCategorySection.jsx` | Collapsible categories |
| `components/packing/PackingSearchFilters.jsx` | Search + filters |
| `components/packing/AddCustomItemForm.jsx` | Custom items |

Integrated in `ItineraryDetail.jsx` after the document vault section.

## How to test

### 1. Generate packing list

1. Log in, open a trip with destination + start date
2. Scroll to **AI Packing Assistant**
3. Click **Generate list**
4. Verify categories populated (Goa in monsoon → raincoat; Manali in winter → jacket)

### 2. Mark packed / progress

1. Check items — progress should update (e.g. 64% packed)
2. Uncheck — progress decreases

### 3. Custom item

1. **Add custom item** → e.g. "Drone", category Photography
2. Item appears in checklist; weight updates if kg provided

### 4. Delete item

1. Remove a custom item via **Remove**
2. Custom items only (AI items stay unless regenerated)

### 5. Regenerate

1. Click **Regenerate** after changing activities or weather context
2. Packed state preserved for matching item names

### 6. Weather integration

1. Set destination with rainy forecast (or demo weather)
2. Regenerate — umbrella/raincoat in list + insight tip

### 7. Weight estimation

1. Check **Estimated luggage weight** card
2. Add heavy custom item — total increases
3. If over flight allowance → amber warning

### 8. PDF / CSV export

1. Click **PDF** or **CSV**
2. File downloads with categories, packed status, weight

### 9. Search & filters

1. Search "passport", filter **Not packed**, filter **Missing docs**
2. Matching items only

### 10. Notifications

1. Set trip start date to 2 days from now
2. Leave passport unpacked (missing doc item)
3. Wait for scheduler or trigger `runNotificationSchedulerJobs()` manually
4. Notification: packing reminder with link to `#packing`

### API smoke test (curl)

```bash
TOKEN=your_jwt
TRIP=trip_id

curl -X POST http://localhost:5000/api/packing/generate \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"tripId\":\"$TRIP\"}"

curl http://localhost:5000/api/packing/$TRIP \
  -H "Authorization: Bearer $TOKEN"
```

## Environment

Uses existing AI keys:

```env
GEMINI_API_KEY=...
OPENAI_API_KEY=...
OPENWEATHER_API_KEY=...   # optional — demo weather if missing
```

No additional env vars required for packing.
