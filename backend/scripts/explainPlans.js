/**
 * Mongo explain-plan + index audit (read-only).
 *
 * Usage (from backend/):
 *   node scripts/explainPlans.js
 *
 * Prints explain("executionStats") for hot list queries and lists indexes.
 */
import dotenv from "dotenv"
import mongoose from "mongoose"
import Itinerary from "../models/Itinerary.js"
import Booking from "../models/Booking.js"
import User from "../models/User.js"
import AuditLog from "../models/AuditLog.js"
import Notification from "../models/Notification.js"

dotenv.config()

function summarizeExplain(label, explanation) {
  const stats = explanation?.executionStats || explanation
  const winning = explanation?.queryPlanner?.winningPlan || {}
  const stage = winning.stage || winning.inputStage?.stage || "?"
  const indexName =
    winning.indexName ||
    winning.inputStage?.indexName ||
    winning.inputStage?.inputStage?.indexName ||
    "COLLSCAN/unknown"
  console.log(`\n=== ${label} ===`)
  console.log(`  winningStage: ${stage}`)
  console.log(`  index: ${indexName}`)
  console.log(`  nReturned: ${stats.nReturned ?? "n/a"}`)
  console.log(`  totalDocsExamined: ${stats.totalDocsExamined ?? "n/a"}`)
  console.log(`  totalKeysExamined: ${stats.totalKeysExamined ?? "n/a"}`)
  console.log(`  executionTimeMillis: ${stats.executionTimeMillis ?? "n/a"}`)
}

async function listIndexes(model) {
  const indexes = await model.collection.indexes()
  console.log(`\nIndexes on ${model.collection.collectionName}:`)
  for (const idx of indexes) {
    console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`)
  }
}

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI
  if (!uri) {
    console.error("MONGO_URI not set")
    process.exit(1)
  }
  await mongoose.connect(uri)
  console.log("Connected. Running explain plans…")

  // Ensure schema indexes exist (idempotent)
  await Promise.all([
    Itinerary.syncIndexes(),
    Booking.syncIndexes(),
    User.syncIndexes(),
    AuditLog.syncIndexes(),
    Notification.syncIndexes(),
  ])

  await listIndexes(Itinerary)
  await listIndexes(Booking)
  await listIndexes(User)
  await listIndexes(AuditLog)

  const ownerSample = await User.findOne().select("_id").lean()
  const ownerId = ownerSample?._id || new mongoose.Types.ObjectId()

  summarizeExplain(
    "Itinerary list by owner+createdAt",
    await Itinerary.find({ ownerId }).sort({ createdAt: -1 }).limit(10).explain("executionStats"),
  )

  summarizeExplain(
    "Booking list by userId+createdAt",
    await Booking.find({ userId: ownerId }).sort({ createdAt: -1 }).limit(20).explain("executionStats"),
  )

  summarizeExplain(
    "User admin filter status+createdAt",
    await User.find({ status: "active" }).sort({ createdAt: -1 }).limit(20).explain("executionStats"),
  )

  summarizeExplain(
    "AuditLog by action+createdAt",
    await AuditLog.find({ action: /LOGIN/i }).sort({ createdAt: -1 }).limit(50).explain("executionStats"),
  )

  summarizeExplain(
    "Notification by user+status+createdAt",
    await Notification.find({ user: ownerId, status: "UNREAD" })
      .sort({ createdAt: -1 })
      .limit(20)
      .explain("executionStats"),
  )

  await mongoose.disconnect()
  console.log("\nDone.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
