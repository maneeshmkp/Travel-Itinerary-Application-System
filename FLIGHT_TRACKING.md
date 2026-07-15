# Live Flight Tracking & Smart Travel Status

Real-time flight monitoring with gate/delay/cancellation alerts, airport dashboard, and itinerary-aware notifications — similar to Flighty and TripIt Pro.

## Architecture

```
Flight Booking Created
        ↓
autoTrackFromBooking() → FlightStatus document
        ↓
Provider Layer (AviationStack → Mock fallback)
        ↓
5-min cache → refresh every 10 min (active flights only)
        ↓
flightNotificationService → push notifications + booking sync
        ↓
FlightDashboard UI (poll every 10 min when active)
```

## Database — `FlightStatus`

**Model:** `backend/models/FlightStatus.js`

| Field | Description |
|-------|-------------|
| `userId`, `tripId`, `bookingId` | Ownership + links |
| `flightNumber`, `airline` | e.g. AI298 |
| `originCode`, `destinationCode` | IATA codes |
| `departureTime`, `arrivalTime` | Scheduled |
| `actualDeparture`, `actualArrival` | Live times |
| `terminal`, `gate`, `previousGate` | Airport info |
| `boardingTime` | Boarding start |
| `status` | Scheduled, Delayed, Boarding, In Air, Landed, Cancelled |
| `baggageClaim` | Belt number after landing |
| `delayMinutes`, `aircraftType`, `durationMinutes` | |
| `trackingActive` | Stops after Landed/Cancelled |
| `provider` | aviationstack or mock |
| `lastUpdated` | Last poll time |

**Booking extension:** `flightNumber`, `originCode`, `destinationCode` on `Booking` model for auto-tracking.

## API (JWT)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/flights/status/:flightNumber` | Live lookup (not persisted) |
| POST | `/api/flights/track` | `{ tripId, flightNumber, bookingId?, ... }` |
| DELETE | `/api/flights/track/:id` | Stop tracking |
| GET | `/api/flights/trip/:tripId` | All tracked flights + airport/weather |
| GET | `/api/flights/history` | Completed tracking records |
| POST | `/api/flights/refresh/:id` | Manual refresh |
| POST | `/api/ai/flight-query` | Copilot Q&A |

> `GET /api/flights` (search/pricing) remains on availability routes — no conflict.

## Provider abstraction

**Entry:** `services/flightTracking/providers/index.js` → `fetchLiveFlightStatus()`

1. **AviationStack** — if `AVIATIONSTACK_API_KEY` is set (`http://api.aviationstack.com/v1/flights`)
2. **Mock** — deterministic demo from flight number + departure time

All providers return a normalized object via `utils/flightMapper.js` → `mapProviderToFlightStatus()`.

Swap providers by env only — controllers never import AviationStack directly.

```env
AVIATIONSTACK_API_KEY=your_key
# Optional future:
# FLIGHTAWARE_API_KEY=
```

## Polling strategy

| Layer | Interval | Scope |
|-------|----------|-------|
| Backend `flightPollingService` | 10 minutes | All `trackingActive` non-terminal flights |
| Provider cache | 5 minutes | Per flightNumber + date key |
| Frontend `useFlightTracking` | 10 minutes | While dashboard open + active flights |

Socket.io is not required; polling is the production path. Disable backend poller: `FLIGHT_TRACKING_POLLER=false`.

## Notification workflow

`flightNotificationService.processFlightNotifications()` compares previous vs current snapshot:

| Event | Notification type |
|-------|-------------------|
| Gate change | `FLIGHT_GATE_CHANGE` |
| Delay +15 min | `FLIGHT_DELAY` |
| Cancelled | `FLIGHT_CANCELLED` |
| Boarding starts | `FLIGHT_BOARDING` |
| Baggage belt | `FLIGHT_BAGGAGE` |
| Delay ≥60 min | `TRAVEL_RISK_ALERT` + itinerary suggestions |

**Itinerary adjustments** are suggested (not auto-applied) in `metadata.itinerarySuggestions`:
- Contact hotel for late check-in
- Reschedule taxi
- Move activities

User is notified before any manual itinerary changes.

## Auto-tracking

On `createBooking()` for `bookingType: "flight"`:
- Parses `flightNumber` or `bookingReference`
- Creates `FlightStatus` if valid
- Syncs gate/terminal back to `Booking`

## Frontend components

| Component | Role |
|-----------|------|
| `FlightDashboard` | Main panel at `#flights` |
| `FlightCard` | Live status card |
| `DelayBanner` | Delay warning + suggestions |
| `GateCard` | Terminal / gate / aircraft |
| `BoardingTimeline` | Progress steps |
| `AirportInfo` | Lounge, food, ATM, map link, weather |
| `BaggageInfo` | Belt after landing |
| Flight copilot | AI Q&A |

## How to test

### 1. Scheduled / tracking start

1. Add flight booking with flight number `AI298`, origin `DEL`, destination `BOM`
2. Open **Live Flight Tracking** (`#flights`)
3. Flight appears automatically

### 2. Delayed

- Use flight number ending in `9` or containing `DELAY` (mock)
- Expect delay banner + `FLIGHT_DELAY` notification

### 3. Cancelled

- Use flight number ending in `0` or containing `CANCEL` (mock)
- Status `Cancelled` + notification

### 4. Gate change

- Refresh flight — mock may assign gate; change triggers `FLIGHT_GATE_CHANGE` on subsequent refresh with different gate

### 5. Boarding

- Set departure ~30 min ahead; refresh → status `Boarding`

### 6. Landed + baggage

- Past departure window → `Landed` + baggage belt number

### 7. Manual track

```bash
curl -X POST http://localhost:5000/api/flights/track \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"tripId":"...","flightNumber":"AI298","originCode":"DEL","destinationCode":"BOM"}'
```

### 8. Copilot

Ask: “Is my flight on time?”, “When should I leave for the airport?”, “Has my gate changed?”

### 9. Documents

Click **Documents** link on flight card → vault for boarding pass / passport

### 10. Expenses

On cancellation, note in UI to log refund/fees in Expense Tracker

### AviationStack live test

Set `AVIATIONSTACK_API_KEY` in `backend/.env`, restart backend, track a real flight number with correct date.
