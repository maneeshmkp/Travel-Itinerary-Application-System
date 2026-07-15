/**
 * Generate TypeScript Fetch client from OpenAPI using OpenAPI Generator.
 * Usage: npm run docs:sdk
 *
 * Requires Java (OpenAPI Generator) OR falls back to openapi-typescript types.
 */
import { spawnSync } from "child_process"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { writeOpenApiYaml, loadOpenApiDocument } from "../config/swagger.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..", "..")
const specPath = writeOpenApiYaml(loadOpenApiDocument())
const outDir = path.join(root, "packages", "travelplan-sdk")

fs.mkdirSync(outDir, { recursive: true })

console.log("OpenAPI source:", specPath)
console.log("SDK output:", outDir)

const args = [
  "-y",
  "@openapitools/openapi-generator-cli",
  "generate",
  "-i",
  specPath,
  "-g",
  "typescript-fetch",
  "-o",
  outDir,
  "--additional-properties=supportsES6=true,typescriptThreePlus=true,withInterfaces=true,npmName=@travelplan/sdk,npmVersion=1.0.0",
]

const result = spawnSync("npx", args, {
  cwd: root,
  stdio: "inherit",
  shell: true,
})

if (result.status !== 0) {
  console.warn("\nOpenAPI Generator failed (often missing Java). Writing minimal typed client stub...")
  fs.writeFileSync(
    path.join(outDir, "index.ts"),
    `/**
 * TravelPlan API client (minimal stub).
 * Regenerate with: npm run docs:sdk  (requires Java + openapi-generator-cli)
 */
export type ApiConfig = { baseUrl?: string; token?: string }

export class TravelPlanClient {
  constructor(private config: ApiConfig = {}) {}

  private url(path: string) {
    const base = (this.config.baseUrl || "http://localhost:5000").replace(/\\/$/, "")
    return \`\${base}\${path.startsWith("/") ? path : \`/\${path}\`}\`
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(this.url(path), {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(this.config.token ? { Authorization: \`Bearer \${this.config.token}\` } : {}),
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
    return this.request("GET", \`/api/v1/itineraries\${query ? \`?\${query}\` : ""}\`)
  }

  health() {
    return this.request("GET", "/api/v1/health")
  }
}

export default TravelPlanClient
`,
  )
  fs.writeFileSync(
    path.join(outDir, "package.json"),
    JSON.stringify(
      {
        name: "@travelplan/sdk",
        version: "1.0.0",
        type: "module",
        main: "index.ts",
        types: "index.ts",
        description: "TravelPlan API TypeScript client",
      },
      null,
      2,
    ),
  )
  fs.writeFileSync(
    path.join(outDir, "README.md"),
    `# @travelplan/sdk

TypeScript client for TravelPlan API \`/api/v1\`.

## Generate full client (OpenAPI Generator)

Requires [Java](https://adoptium.net/) installed.

\`\`\`bash
cd backend
npm run docs:sdk
\`\`\`

## Minimal stub usage

\`\`\`ts
import { TravelPlanClient } from "@travelplan/sdk"

const api = new TravelPlanClient({ baseUrl: "http://localhost:5000" })
const { token } = await api.login("you@example.com", "Secret123!")
const authed = new TravelPlanClient({ baseUrl: "http://localhost:5000", token })
await authed.me()
\`\`\`
`,
  )
  console.log("Wrote minimal SDK stub to packages/travelplan-sdk")
  process.exit(0)
}

console.log("TypeScript SDK generated successfully.")
