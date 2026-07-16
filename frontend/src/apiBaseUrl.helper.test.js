import { describe, it, expect } from "vitest"
import {
  resolveApiBaseUrl,
  resolveApiBaseUrlForTest,
  resolveSocketOrigin,
  DEFAULT_PRODUCTION_API_URL,
  DEFAULT_PRODUCTION_SOCKET_URL,
} from "./apiBaseUrl.helper.js"

describe("API base URL helper", () => {
  it("appends /api when missing", () => {
    expect(resolveApiBaseUrlForTest("https://api.example.com")).toBe("https://api.example.com/api")
  })

  it("keeps trailing /api", () => {
    expect(resolveApiBaseUrlForTest("https://api.example.com/api")).toBe("https://api.example.com/api")
  })

  it("uses Vite proxy path in development when unset", () => {
    expect(resolveApiBaseUrl(undefined, { isDev: true })).toBe("/api")
  })

  it("never falls back to localhost in production", () => {
    expect(resolveApiBaseUrl(undefined, { isDev: false })).toBe(DEFAULT_PRODUCTION_API_URL)
    expect(resolveApiBaseUrl("", { isDev: false })).toBe(DEFAULT_PRODUCTION_API_URL)
    expect(DEFAULT_PRODUCTION_API_URL).not.toMatch(/localhost|127\.0\.0\.1/)
  })

  it("honors VITE_API_URL in production", () => {
    expect(
      resolveApiBaseUrl("https://travel-itinerary-application-system.onrender.com/api", {
        isDev: false,
      }),
    ).toBe("https://travel-itinerary-application-system.onrender.com/api")
  })
})

describe("Socket origin helper", () => {
  it("derives socket origin from API URL", () => {
    expect(
      resolveSocketOrigin({
        apiUrl: "https://travel-itinerary-application-system.onrender.com/api",
        isDev: false,
      }),
    ).toBe("https://travel-itinerary-application-system.onrender.com")
  })

  it("uses production socket default when unset in prod", () => {
    expect(resolveSocketOrigin({ isDev: false })).toBe(DEFAULT_PRODUCTION_SOCKET_URL)
  })
})
