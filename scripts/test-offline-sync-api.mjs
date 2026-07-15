/**
 * API-level smoke test for offline sync idempotency (no browser required).
 * Run: node scripts/test-offline-sync-api.mjs
 */
const API = process.env.API_URL || "http://localhost:5000/api"
const runId = Date.now()
const email = `offline-test-${runId}@example.com`
const password = "TestPass123!"

async function req(path, { method = "GET", token, headers = {}, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }
  return { status: res.status, data }
}

async function main() {
  console.log("1. Health check…")
  const health = await req("/health")
  if (health.status !== 200) throw new Error(`Health failed: ${health.status}`)

  console.log("2. Sign up test user…")
  const signup = await req("/auth/signup", {
    method: "POST",
    body: { name: "Offline Test", email, password, confirmPassword: password },
  })
  if (signup.status !== 201 && signup.status !== 200) {
    throw new Error(`Signup failed: ${signup.status} ${JSON.stringify(signup.data)}`)
  }
  const token = signup.data?.token || signup.data?.data?.token
  if (!token) throw new Error("No token from signup")

  console.log("3. Create itinerary…")
  const trip = await req("/itineraries", {
    method: "POST",
    token,
    body: {
      title: "Offline Sync Test",
      destination: "Agra",
      numberOfNights: 1,
      description: "Idempotency test trip",
      days: [
        {
          dayNumber: 1,
          title: "Day 1",
          hotel: { name: "Test Hotel", location: "Agra" },
          activities: [],
        },
      ],
      budget: { max: 500, currency: "USD" },
    },
  })
  if (trip.status !== 201) throw new Error(`Create trip failed: ${trip.status}`)
  const tripId = trip.data?.data?._id
  if (!tripId) throw new Error("No trip id")

  const clientRequestId = `offline-expense-${runId}`
  const idempotencyKey = clientRequestId
  const expenseBody = {
    amount: 42,
    category: "food",
    description: "Offline lunch",
    dayNumber: 1,
    currency: "USD",
    clientRequestId,
  }

  console.log("4. Create expense (first request)…")
  const first = await req(`/itineraries/${tripId}/expenses`, {
    method: "POST",
    token,
    headers: {
      "X-Idempotency-Key": idempotencyKey,
      "X-Client-Request-Id": clientRequestId,
    },
    body: expenseBody,
  })
  if (first.status !== 201 && first.status !== 200) {
    throw new Error(`First expense failed: ${first.status} ${JSON.stringify(first.data)}`)
  }
  const expenseId1 = first.data?.data?.expense?.id || first.data?.data?.id || first.data?.data?._id

  console.log("5. Duplicate expense (same idempotency key)…")
  const second = await req(`/itineraries/${tripId}/expenses`, {
    method: "POST",
    token,
    headers: {
      "X-Idempotency-Key": idempotencyKey,
      "X-Client-Request-Id": clientRequestId,
    },
    body: expenseBody,
  })
  const expenseId2 = second.data?.data?.expense?.id || second.data?.data?.id || second.data?.data?._id

  console.log("6. List expenses…")
  const list = await req(`/itineraries/${tripId}/expenses`, { token })
  const report = list.data?.data
  const expenses = report?.expenses || report || []
  const matching = Array.isArray(expenses)
    ? expenses.filter((e) => e.description === "Offline lunch")
    : []

  const passed =
    expenseId1 &&
    expenseId1 === expenseId2 &&
    matching.length <= 1

  if (!passed) {
    console.error("FAIL", { expenseId1, expenseId2, matchingCount: matching.length })
    process.exit(1)
  }

  console.log("PASS — duplicate offline expense sync prevented (single expense, same id returned).")
  console.log(`   Trip: ${tripId}, Expense: ${expenseId1}`)
}

main().catch((err) => {
  console.error("FAIL —", err.message || err)
  process.exit(1)
})
