/**
 * Validate OpenAPI 3.1 document and write openapi.yaml.
 * Usage: node scripts/validateOpenApi.js
 */
import path from "path"
import { fileURLToPath } from "url"
import SwaggerParser from "@apidevtools/swagger-parser"
import { loadOpenApiDocument, writeOpenApiYaml } from "../config/swagger.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function main() {
  const doc = loadOpenApiDocument()
  const out = writeOpenApiYaml(doc)
  console.log("Wrote", out)

  // Dereference + validate structure
  const api = await SwaggerParser.validate(structuredClone(doc), {
    dereference: { circular: "ignore" },
  })
  const pathCount = Object.keys(api.paths || {}).length
  const schemaCount = Object.keys(api.components?.schemas || {}).length
  console.log(`OpenAPI OK — paths=${pathCount} schemas=${schemaCount} version=${api.openapi}`)
}

main().catch((err) => {
  console.error("OpenAPI validation FAILED:", err.message)
  process.exit(1)
})
