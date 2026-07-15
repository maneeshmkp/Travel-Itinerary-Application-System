/**
 * Visibility rules for browse/catalog itineraries under multi-tenancy.
 *
 * Platform seed trips (`createdBy: "System"` with no private owner) often have
 * tenantId=null and were hidden after tenantScopePlugin started injecting
 * tenantId filters. Browse must show the community catalog + the caller's
 * tenant / owned / collaborated trips — not other users' private or E2E rows.
 */
import mongoose from "mongoose"
import { getTenantContext, runWithTenantContext } from "./tenantScope.js"

/**
 * @param {{ _id?: unknown, id?: unknown }} [user]
 * @param {string|import("mongoose").Types.ObjectId|null} [tenantId]
 */
export function browseItineraryVisibilityFilter(user, tenantId = null) {
  const ctxTenant = tenantId ?? getTenantContext()?.tenantId ?? null
  const uid = user?._id || user?.id || null
  const ors = [
    // Seeded / platform catalog (shared) — exclude owned test/E2E rows
    {
      createdBy: "System",
      $or: [{ ownerId: null }, { ownerId: { $exists: false } }],
    },
    { isRecommended: true },
  ]

  if (ctxTenant && mongoose.isValidObjectId(String(ctxTenant))) {
    ors.push({ tenantId: new mongoose.Types.ObjectId(String(ctxTenant)) })
  }
  if (uid && mongoose.isValidObjectId(String(uid))) {
    const oid = new mongoose.Types.ObjectId(String(uid))
    ors.push({ ownerId: oid })
    ors.push({ "collaborators.userId": oid })
  }

  return { $or: ors }
}

/**
 * Run a mongoose query/callback without tenant ALS injection.
 */
export async function withBrowseItineraryScope(user, fn) {
  return runWithTenantContext({ bypass: true, tenantId: null }, () => fn())
}

/**
 * Whether a loaded itinerary (lean or doc) is readable by this user in browse scope.
 */
export function canViewItineraryInBrowse(itinerary, user, tenantId = null) {
  if (!itinerary) return false
  if (itinerary.isRecommended === true) return true
  const ownerRef = itinerary.ownerId?._id || itinerary.ownerId
  const hasOwner = Boolean(ownerRef)
  if (itinerary.createdBy === "System" && !hasOwner) return true
  const ctxTenant = tenantId ?? getTenantContext()?.tenantId ?? null
  if (ctxTenant && itinerary.tenantId && String(itinerary.tenantId) === String(ctxTenant)) {
    return true
  }
  const uid = user?._id || user?.id
  if (uid && ownerRef && String(ownerRef) === String(uid)) return true
  const collabs = itinerary.collaborators || []
  if (uid && collabs.some((c) => String(c.userId?._id || c.userId) === String(uid))) {
    return true
  }
  return false
}
