/**
 * TravelPlan API client (minimal stub).
 * Regenerate with: npm run docs:sdk  (requires Java + openapi-generator-cli)
 */
export type ApiConfig = { baseUrl?: string; token?: string }

export class TravelPlanClient {
  constructor(private config: ApiConfig = {}) {}

  private url(path: string) {
    const base = (this.config.baseUrl || "http://localhost:5000").replace(/\/$/, "")
    return `${base}${path.startsWith("/") ? path : `/${path}`}`
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(this.url(path), {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(this.config.token ? { Authorization: `Bearer ${this.config.token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw Object.assign(new Error(err.message || res.statusText), { status: res.status, body: err })
    }
    return res.json() as Promise<T>
  }

  login(email: string, password: string) {
    return this.request("POST", "/api/v1/auth/login", { email, password })
  }

  me() {
    return this.request("GET", "/api/v1/auth/me")
  }

  listTrips(query = "") {
    return this.request("GET", `/api/v1/itineraries${query ? `?${query}` : ""}`)
  }

  health() {
    return this.request("GET", "/api/v1/health")
  }
}

export default TravelPlanClient
