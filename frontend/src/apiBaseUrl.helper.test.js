import { describe, it, expect } from "vitest"
import { resolveApiBaseUrlForTest } from "./apiBaseUrl.helper.js"

describe("API base URL helper", () => {
  it("appends /api when missing", () => {
    expect(resolveApiBaseUrlForTest("https://api.example.com")).toBe("https://api.example.com/api")
  })

  it("keeps trailing /api", () => {
    expect(resolveApiBaseUrlForTest("https://api.example.com/api")).toBe("https://api.example.com/api")
  })
})
