# Booking Management System

TravelPlan’s **Booking Hub** lets travelers store reservations from any provider (not direct booking). Think TripIt / Google Travel “my trips” — confirmations, documents, and timeline in one place.

## Architecture

```
React (BookingTracker / BookingsHub)
        ↓ bookingAPI
Express routes (/api/bookings, /api/trips/:id/bookings)
        ↓
bookingController → bookingService → Booking model (MongoDB)
        ↓
Notifications (create/update/delete + scheduler reminders)
        ↓
Expense tracker (convert booking → TripExpense)
```

## Database — `Booking`

| Field | Purpose |
|-------|---------|
| `userId` | Owner (JWT user) |
| `tripId` | Linked itinerary |
| `bookingType` | flight, hotel, train, bus, taxi, rental_car, cruise, activity, restaurant, insurance, visa, other |
| `provider` | Airline, hotel chain, etc. |
| `bookingReference` / `confirmationNumber` | Searchable IDs |
| `status` | upcoming, confirmed, pending, cancelled, completed (auto-resolved by date) |
| `departureDate` / `arrivalDate` | Transport |
| `checkIn` / `checkOut` | Hotels |
| `eventDate` | Restaurants, activities |
| `price` / `currency` / `paymentStatus` | Cost tracking |
| `travelerNames`, `seatNumber`, `gate`, `terminal` | Flight details |
| `hotelAddress`, `phone`, `website`, `email` | Contact |
| `latitude` / `longitude` | Map markers |
| `attachments[]` | Base64 PDF/images (max 2MB each) |
| `expenseId` | Link after “Convert to expense” |

**Indexes:** `userId`, `tripId`, `status`, `bookingType`, references, compound idempotency.

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookings` | List (paginated, filter, sort) |
| GET | `/api/bookings/search?q=` | Search reference, provider, traveler |
| GET | `/api/bookings/upcoming?days=14` | Upcoming window |
| GET | `/api/bookings/dashboard` | Stats cards |
| GET | `/api/bookings/ai-context` | Bookings for AI |
| GET | `/api/bookings/:id` | Detail + attachments |
| POST | `/api/bookings` | Create |
| PUT | `/api/bookings/:id` | Update |
| DELETE | `/api/bookings/:id` | Delete |
| POST | `/api/bookings/:id/convert-expense` | → expense tracker |
| GET | `/api/trips/:id/bookings` | Trip-scoped list |
| GET | `/api/trips/:id/bookings/timeline` | Chronological timeline |
| GET | `/api/trips/:id/bookings/map-markers` | Map coordinates |
| POST | `/api/ai/booking-query` | AI answers about bookings |

All routes require JWT (`protect`).

## Booking Timeline

`buildTimeline()` sorts bookings by **primary date**:

- Hotel → `checkIn`
- Flight/train → `departureDate`
- Restaurant → `eventDate`

Returns `items` (flat sorted) and `byDate` (grouped `YYYY-MM-DD`) for vertical timeline UI.

## Reminder integration

**On CRUD:** `notifyBookingEvent` → in-app notification (`BOOKING_CONFIRMED`, `BOOKING_UPDATED`, `BOOKING_CANCELLED`).

**Scheduler (`runBookingReminders`):** every 15 min with other jobs:

- Flight departing within 24h → `FLIGHT_DEPARTURE`
- Hotel check-in tomorrow → `HOTEL_CHECKIN`
- Restaurant today → booking reminder
- Flight with gate within 90 min → `FLIGHT_BOARDING`

Dedup via `metadata.dedupKey`. Respects user `bookingAlerts` setting.

## Expense integration

`POST /api/bookings/:id/convert-expense` maps type → expense category (hotel→accommodation, flight→transport, etc.) and creates a `TripExpense`. Sets `booking.expenseId` to prevent duplicates.

## How to test

```bash
# Backend
cd backend && npm run dev

# Seed sample bookings (needs user + itinerary)
npm run seed:bookings

# Frontend
cd frontend && npm run dev
```

1. Open **Bookings** in navbar → `/bookings` — dashboard, search, filters.
2. Open any trip → **My Bookings** section — timeline, add flight/hotel, upload PDF.
3. Open booking detail → convert to expense → check Expense Tracker.
4. Ask AI tab: “When is my flight?”
5. Wait for scheduler or `POST /api/notifications/scheduler/run` for reminders.

## Files

| Area | Path |
|------|------|
| Model | `backend/models/Booking.js` |
| Service | `backend/services/bookings/bookingService.js` |
| Controller | `backend/controllers/booking/bookingController.js` |
| Routes | `backend/routes/bookings.js`, `backend/routes/tripRoutes.js` |
| Helpers | `backend/utils/bookingHelpers.js` |
| UI | `frontend/src/components/bookings/*` |
| Pages | `frontend/src/pages/BookingsHub.jsx`, `BookingDetailPage.jsx` |
