/**
 * AsyncLocalStorage tenant context + mongoose plugin for automatic isolation.
 */
import { AsyncLocalStorage } from "async_hooks"
import mongoose from "mongoose"

export const tenantStore = new AsyncLocalStorage()

export function getTenantContext() {
  return tenantStore.getStore() || null
}

export function runWithTenantContext(ctx, fn) {
  return tenantStore.run(ctx || {}, fn)
}

/** Express-friendly — binds context for the remainder of the request. */
export function enterTenantContext(ctx) {
  tenantStore.enterWith(ctx || {})
}

/**
 * Apply to schemas that must be tenant-scoped.
 */
export function tenantScopePlugin(schema) {
  if (!schema.path("tenantId")) {
    schema.add({
      tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tenant",
        index: true,
        default: null,
      },
    })
  }

  const applyFilter = function applyTenantFilter() {
    const ctx = getTenantContext()
    if (!ctx || ctx.bypass) return
    if (!ctx.tenantId) return
    const existing = this.getQuery?.() || {}
    if (Object.prototype.hasOwnProperty.call(existing, "tenantId")) return
    this.where({ tenantId: ctx.tenantId })
  }

  schema.pre(/^find/, applyFilter)
  schema.pre("countDocuments", applyFilter)
  schema.pre("count", applyFilter)
  schema.pre("findOneAndUpdate", applyFilter)
  schema.pre("updateMany", applyFilter)
  schema.pre("updateOne", applyFilter)
  schema.pre("deleteMany", applyFilter)
  schema.pre("deleteOne", applyFilter)

  schema.pre("save", function stampTenant(next) {
    const ctx = getTenantContext()
    if (!this.tenantId && ctx?.tenantId && !ctx.bypass) {
      this.tenantId = ctx.tenantId
    }
    next()
  })
}

/** Explicit filter helper for aggregations / raw queries. */
export function withTenant(filter = {}, reqOrCtx = null) {
  const ctx =
    reqOrCtx?.tenantId != null
      ? { tenantId: reqOrCtx.tenantId, bypass: reqOrCtx.tenantBypass }
      : getTenantContext()
  if (!ctx || ctx.bypass || !ctx.tenantId) return { ...filter }
  if (Object.prototype.hasOwnProperty.call(filter, "tenantId")) return { ...filter }
  return { ...filter, tenantId: ctx.tenantId }
}
