/**
 * Generate Postman collection + environment from OpenAPI.
 * Usage: node scripts/generatePostman.js
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { loadOpenApiDocument } from "../config/swagger.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, "..", "docs", "postman")

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true })
}

function pathToPostman(urlPath) {
  // Prefer v1 paths only for collection (skip legacy duplicates)
  if (!urlPath.startsWith("/api/v1") && urlPath !== "/health" && urlPath !== "/api/health") {
    return null
  }
  return urlPath
}

function buildCollection(doc) {
  const itemsByTag = new Map()

  for (const [rawPath, methods] of Object.entries(doc.paths || {})) {
    const urlPath = pathToPostman(rawPath)
    if (!urlPath) continue

    for (const [method, op] of Object.entries(methods)) {
      if (!["get", "post", "put", "patch", "delete"].includes(method)) continue
      const tag = (op.tags && op.tags[0]) || "General"
      if (!itemsByTag.has(tag)) itemsByTag.set(tag, [])

      const useAuth =
        Array.isArray(op.security) && op.security.some((s) => s && Object.keys(s).includes("bearerAuth"))
      const auth = useAuth
        ? { type: "bearer", bearer: [{ key: "token", value: "{{jwt}}", type: "string" }] }
        : { type: "noauth" }

      const segments = urlPath.replace(/^\//, "").split("/")
      const item = {
        name: op.summary || `${method.toUpperCase()} ${urlPath}`,
        request: {
          method: method.toUpperCase(),
          header: [{ key: "Content-Type", value: "application/json" }],
          auth,
          url: {
            raw: `{{baseUrl}}${urlPath}`,
            host: ["{{baseUrl}}"],
            path: segments,
          },
          description: op.description || op.summary || "",
        },
      }

      if (op.requestBody?.content?.["application/json"]?.example) {
        item.request.body = {
          mode: "raw",
          raw: JSON.stringify(op.requestBody.content["application/json"].example, null, 2),
        }
      } else if (op.requestBody?.content?.["application/json"]?.schema) {
        const schema = op.requestBody.content["application/json"].schema
        if (schema?.$ref?.includes("LoginRequest")) {
          item.request.body = {
            mode: "raw",
            raw: JSON.stringify({ email: "{{email}}", password: "{{password}}" }, null, 2),
          }
        } else if (schema?.$ref?.includes("SignupRequest")) {
          item.request.body = {
            mode: "raw",
            raw: JSON.stringify(
              {
                name: "Postman User",
                email: "{{email}}",
                password: "{{password}}",
                confirmPassword: "{{password}}",
              },
              null,
              2,
            ),
          }
        }
      }

      itemsByTag.get(tag).push(item)
    }
  }

  return {
    info: {
      name: "TravelPlan API v1",
      description: doc.info?.description || "TravelPlan public API",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    variable: [
      { key: "baseUrl", value: "http://localhost:5000" },
      { key: "jwt", value: "" },
    ],
    item: [...itemsByTag.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, item]) => ({ name, item })),
  }
}

function buildEnvironment() {
  return {
    id: "travelplan-local",
    name: "TravelPlan Local",
    values: [
      { key: "baseUrl", value: "http://localhost:5000", enabled: true },
      { key: "apiBase", value: "http://localhost:5000/api/v1", enabled: true },
      { key: "jwt", value: "", enabled: true },
      { key: "email", value: "you@example.com", enabled: true },
      { key: "password", value: "TestPass123!", enabled: true },
      { key: "tripId", value: "", enabled: true },
    ],
    _postman_variable_scope: "environment",
  }
}

ensureDir(outDir)
const doc = loadOpenApiDocument()
const collection = buildCollection(doc)
const env = buildEnvironment()

fs.writeFileSync(
  path.join(outDir, "TravelPlan.postman_collection.json"),
  JSON.stringify(collection, null, 2),
)
fs.writeFileSync(
  path.join(outDir, "TravelPlan.postman_environment.json"),
  JSON.stringify(env, null, 2),
)

// Also copy to repo docs/ for discoverability
const repoDocs = path.join(__dirname, "..", "..", "docs")
ensureDir(repoDocs)
fs.copyFileSync(
  path.join(outDir, "TravelPlan.postman_collection.json"),
  path.join(repoDocs, "TravelPlan.postman_collection.json"),
)
fs.copyFileSync(
  path.join(outDir, "TravelPlan.postman_environment.json"),
  path.join(repoDocs, "TravelPlan.postman_environment.json"),
)

console.log("Postman collection written:")
console.log(" - backend/docs/postman/TravelPlan.postman_collection.json")
console.log(" - backend/docs/postman/TravelPlan.postman_environment.json")
console.log(" - docs/TravelPlan.postman_collection.json")
