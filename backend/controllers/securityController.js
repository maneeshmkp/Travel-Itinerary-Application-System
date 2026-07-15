/**
 * Security monitoring dashboard data.
 */
import AuditLog from "../models/AuditLog.js"
import Session from "../models/Session.js"
import { getSecurityMetricsSnapshot } from "../services/security/securityMetrics.js"
import { getRedisCacheMetrics } from "../services/monitoring/metricsStore.js"
import { AuditActions } from "../services/auditService.js"
import { runWithTenantContext } from "../utils/tenantScope.js"

export async function getSecurityDashboard(_req, res) {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const metrics = getSecurityMetricsSnapshot()
    const redis = getRedisCacheMetrics()

    const [failedLogins24h, permDenied24h, activeSessions, recentFailed, recentDenied] =
      await runWithTenantContext({ bypass: true }, async () =>
        Promise.all([
          AuditLog.countDocuments({
            action: AuditActions.LOGIN_FAILED,
            createdAt: { $gte: since },
          }),
          AuditLog.countDocuments({
            action: AuditActions.PERMISSION_DENIED,
            createdAt: { $gte: since },
          }),
          Session.countDocuments({
            revokedAt: null,
            expiresAt: { $gt: new Date() },
          }),
          AuditLog.find({ action: AuditActions.LOGIN_FAILED })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean(),
          AuditLog.find({ action: AuditActions.PERMISSION_DENIED })
            .sort({ createdAt: -1 })
            .limit(15)
            .lean(),
        ]),
      )

    res.json({
      success: true,
      data: {
        summary: {
          failedLogins24h,
          permissionDenied24h: permDenied24h,
          activeSessions,
          blockedRequests1h: metrics.counts.blockedRequests,
          suspicious1h: metrics.counts.suspicious,
          rateLimited: redis.rateLimited,
        },
        live: metrics,
        rateLimits: redis.rateLimitedByBucket,
        recentFailedLogins: recentFailed.map((r) => ({
          id: r._id,
          email: r.actorEmail || r.metadata?.email,
          ip: r.ip,
          at: r.createdAt,
        })),
        recentPermissionDenied: recentDenied.map((r) => ({
          id: r._id,
          actor: r.actorEmail,
          path: r.metadata?.path,
          message: r.metadata?.message,
          at: r.createdAt,
        })),
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export async function listActiveSessionsAdmin(req, res) {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 40))
    const sessions = await Session.find({
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    })
      .sort({ lastUsedAt: -1 })
      .limit(limit)
      .populate("userId", "name email role")
      .lean()

    res.json({
      success: true,
      data: {
        sessions: sessions.map((s) => ({
          id: s._id,
          user: s.userId
            ? { id: s.userId._id, name: s.userId.name, email: s.userId.email, role: s.userId.role }
            : null,
          deviceId: s.deviceId,
          deviceName: s.deviceName,
          ip: s.ip,
          userAgent: s.userAgent,
          lastUsedAt: s.lastUsedAt,
          expiresAt: s.expiresAt,
          createdAt: s.createdAt,
        })),
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
