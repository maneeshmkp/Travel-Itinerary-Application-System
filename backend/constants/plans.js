/**
 * SaaS billing plans + soft limits.
 */
export const PLANS = Object.freeze({
  FREE: "free",
  PRO: "pro",
  ENTERPRISE: "enterprise",
})

/** -1 = unlimited */
export const PLAN_LIMITS = Object.freeze({
  [PLANS.FREE]: {
    label: "Free",
    users: 3,
    trips: 10,
    aiRequests: 50,
    storageBytes: 100 * 1024 * 1024, // 100MB
    documents: 25,
  },
  [PLANS.PRO]: {
    label: "Pro",
    users: 25,
    trips: 200,
    aiRequests: 2000,
    storageBytes: 5 * 1024 * 1024 * 1024, // 5GB
    documents: 1000,
  },
  [PLANS.ENTERPRISE]: {
    label: "Enterprise",
    users: -1,
    trips: -1,
    aiRequests: -1,
    storageBytes: -1,
    documents: -1,
  },
})

export function getPlanLimits(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS[PLANS.FREE]
}

export function isWithinLimit(used, limit) {
  if (limit < 0) return true
  return Number(used || 0) < limit
}

export const TENANT_ROLES = Object.freeze({
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
  GUEST: "guest",
})

export const TENANT_ROLE_RANK = Object.freeze({
  [TENANT_ROLES.GUEST]: 1,
  [TENANT_ROLES.MEMBER]: 2,
  [TENANT_ROLES.ADMIN]: 3,
  [TENANT_ROLES.OWNER]: 4,
})

export const TENANT_STATUSES = Object.freeze({
  ACTIVE: "active",
  SUSPENDED: "suspended",
  TRIAL: "trial",
})
