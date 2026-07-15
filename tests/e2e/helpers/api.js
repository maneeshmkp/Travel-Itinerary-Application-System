/**
 * Backend API helpers for setup/teardown without changing product UI.
 * Used when a flow has no button (e.g. itinerary delete) or for seeding.
 */
import { apiBase, DEFAULT_PASSWORD, uniqueEmail } from "./testData.js"

async function jsonFetch(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${apiBase()}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

export async function apiSignup({ name = "E2E User", email, password = DEFAULT_PASSWORD } = {}) {
  const e = email || uniqueEmail()
  const { ok, status, data } = await jsonFetch("/auth/signup", {
    method: "POST",
    body: { name, email: e, password, confirmPassword: password },
  })
  if (!ok) {
    throw new Error(`Signup failed (${status}): ${data.message || JSON.stringify(data)}`)
  }
  return {
    email: e,
    password,
    token: data.token || data.data?.token,
    user: data.user || data.data?.user,
  }
}

export async function apiLogin(email, password = DEFAULT_PASSWORD) {
  const { ok, status, data } = await jsonFetch("/auth/login", {
    method: "POST",
    body: { email, password },
  })
  if (!ok) throw new Error(`Login failed (${status}): ${data.message || ""}`)
  return { token: data.token || data.data?.token, user: data.user || data.data?.user }
}

export async function apiCreateItinerary(token, { title, destination } = {}) {
  const body = {
    title: title || `API Trip ${Date.now()}`,
    destination: destination || "Barcelona, Spain",
    numberOfNights: 2,
    description: "Created by Playwright API helper",
    budget: { min: 100, max: 500, currency: "USD" },
    highlights: ["E2E"],
    tags: [],
    days: [
      {
        dayNumber: 1,
        dayLabel: "Arrival",
        hotel: { name: "E2E Hotel", location: "Center", rating: 4 },
        activities: [
          {
            name: "City tour",
            description: "Walk the old town",
            location: "Plaza",
            category: "sightseeing",
            duration: "2 hours",
            time: "10:00 AM",
            cost: 0,
          },
        ],
      },
    ],
  }
  const { ok, status, data } = await jsonFetch("/itineraries", {
    method: "POST",
    token,
    body,
  })
  if (!ok) {
    throw new Error(`Create itinerary failed (${status}): ${data.message || JSON.stringify(data)}`)
  }
  const id = data.data?._id || data.data?.id || data._id || data.id
  return { id: String(id), data: data.data || data }
}

export async function apiDeleteItinerary(token, id) {
  return jsonFetch(`/itineraries/${id}`, { method: "DELETE", token })
}

export async function apiCreateNotification(token, payload) {
  // Prefer generic notifications create if exposed; otherwise no-op
  return jsonFetch("/notifications", {
    method: "POST",
    token,
    body: payload,
  })
}

export async function apiHealth() {
  try {
    const res = await fetch(`${apiBase()}/health`)
    return res.ok
  } catch {
    return false
  }
}

/**
 * Inject auth into browser localStorage (matches AuthContext keys).
 */
export async function injectAuth(page, { token, user }) {
  await page.goto("/")
  await page.evaluate(
    ({ token: t, user: u }) => {
      localStorage.setItem("token", t)
      localStorage.setItem("user", JSON.stringify(u || { name: "E2E", email: "e2e@test.com" }))
      localStorage.removeItem("authToken")
    },
    { token, user },
  )
  await page.reload({ waitUntil: "domcontentloaded" })
}
