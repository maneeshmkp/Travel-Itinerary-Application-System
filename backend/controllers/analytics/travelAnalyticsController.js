import {
  recalculateAnalytics,
  getAnalyticsDashboard,
  getYearReport,
  getMonthReport,
  getTravelScore,
  getAnalyticsForExport,
} from "../../services/travelAnalytics/travelAnalyticsService.js"
import { buildAnalyticsCsv, buildAnalyticsPdfBuffer } from "../../services/travelAnalytics/analyticsExportService.js"

function handleError(res, err) {
  const status = err.statusCode || 500
  return res.status(status).json({ success: false, message: err.message || "Request failed" })
}

export const getDashboard = async (req, res) => {
  try {
    const data = await getAnalyticsDashboard(req.user._id)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const getYear = async (req, res) => {
  try {
    const year = Number(req.params.year)
    if (!Number.isFinite(year)) return res.status(400).json({ success: false, message: "Invalid year" })
    const data = await getYearReport(req.user._id, year)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const getMonth = async (req, res) => {
  try {
    const month = String(req.params.month)
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: "Month must be YYYY-MM" })
    }
    const data = await getMonthReport(req.user._id, month)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const getScore = async (req, res) => {
  try {
    const data = await getTravelScore(req.user._id)
    res.json({ success: true, data })
  } catch (err) {
    handleError(res, err)
  }
}

export const postRecalculate = async (req, res) => {
  try {
    const force = Boolean(req.body?.force)
    const data = await recalculateAnalytics(req.user._id, { force })
    res.json({ success: true, demo: Boolean(data.demo), data })
  } catch (err) {
    handleError(res, err)
  }
}

export const exportCsv = async (req, res) => {
  try {
    const year = req.query.year ? Number(req.query.year) : null
    const data = await getAnalyticsForExport(req.user._id, { year })
    const csv = buildAnalyticsCsv(data)
    const filename = year ? `travel-stats-${year}.csv` : "travel-statistics.csv"
    res.setHeader("Content-Type", "text/csv; charset=utf-8")
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    res.send(csv)
  } catch (err) {
    handleError(res, err)
  }
}

export const exportPdf = async (req, res) => {
  try {
    const year = req.query.year ? Number(req.query.year) : null
    const data = await getAnalyticsForExport(req.user._id, { year })
    const buffer = await buildAnalyticsPdfBuffer(data, { year })
    const filename = year ? `travel-report-${year}.pdf` : "travel-analytics.pdf"
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    res.send(buffer)
  } catch (err) {
    handleError(res, err)
  }
}
