/**
 * Swagger UI + OpenAPI 3.1 serving.
 * UI: GET /docs
 * Spec JSON: GET /docs/openapi.json
 * Spec YAML: GET /docs/openapi.yaml
 */
import path from "path"
import fs from "fs"
import { fileURLToPath } from "url"
import swaggerUi from "swagger-ui-express"
import YAML from "yaml"
import { buildOpenApiDocument } from "../docs/openapi/buildSpec.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const openApiYamlPath = path.join(__dirname, "..", "docs", "openapi.yaml")

let cachedDoc = null

export function loadOpenApiDocument() {
  if (cachedDoc) return cachedDoc
  cachedDoc = buildOpenApiDocument()
  return cachedDoc
}

/** Persist YAML for SDK / Postman tooling */
export function writeOpenApiYaml(doc = loadOpenApiDocument()) {
  const dir = path.dirname(openApiYamlPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(openApiYamlPath, YAML.stringify(doc), "utf8")
  return openApiYamlPath
}

export function mountSwagger(app) {
  const document = loadOpenApiDocument()
  try {
    writeOpenApiYaml(document)
  } catch {
    /* non-fatal on read-only FS */
  }

  app.get("/docs/openapi.json", (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=60")
    res.json(document)
  })

  app.get("/docs/openapi.yaml", (_req, res) => {
    res.type("application/yaml")
    res.setHeader("Cache-Control", "public, max-age=60")
    try {
      if (fs.existsSync(openApiYamlPath)) {
        res.send(fs.readFileSync(openApiYamlPath, "utf8"))
      } else {
        res.send(YAML.stringify(document))
      }
    } catch {
      res.send(YAML.stringify(document))
    }
  })

  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(document, {
      customSiteTitle: "TravelPlan API Docs",
      customCss: ".swagger-ui .topbar { display: none }",
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true,
        docExpansion: "none",
        tagsSorter: "alpha",
        operationsSorter: "alpha",
      },
    }),
  )
}

export default { mountSwagger, loadOpenApiDocument, writeOpenApiYaml }
