import ChatSession from "../models/ChatSession.js"
import { runCopilotChat, chunkTextForStream } from "../services/copilot/copilotService.js"
import { loadExpenseSummary } from "../services/copilot/copilotContext.js"
import { createTripExpense, deleteTripExpense } from "../services/expenseService.js"

function badRequest(res, message) {
  return res.status(400).json({ success: false, message })
}

function aiErrorResponse(res, err) {
  const status =
    Number.isInteger(err?.clientStatus) && err.clientStatus >= 400 && err.clientStatus < 600
      ? err.clientStatus
      : 503
  return res.status(status).json({
    success: false,
    message: err?.message || "Copilot request failed",
  })
}

/** POST /api/chat — enhanced copilot (backward compatible shape) */
export const copilotChat = async (req, res) => {
  try {
    const messages = req.body?.messages
    if (!Array.isArray(messages) || messages.length === 0) {
      return badRequest(res, "messages array is required")
    }

    const result = await runCopilotChat({
      messages,
      userId: req.user?._id,
      sessionId: req.body?.sessionId,
      itineraryId: req.body?.itineraryId,
      itinerarySnapshot: req.body?.itinerarySnapshot,
    })

    res.status(200).json({
      success: true,
      demo: Boolean(result.demo),
      data: {
        reply: result.reply,
        planDraft: result.planDraft,
        cards: result.cards,
        followUps: result.followUps,
        quickActions: result.quickActions,
        itineraryUpdated: result.itineraryUpdated,
        itinerary: result.itinerary,
        sessionId: result.sessionId,
      },
    })
  } catch (err) {
    return aiErrorResponse(res, err)
  }
}

/** POST /api/chat/stream — SSE token streaming */
export const copilotChatStream = async (req, res) => {
  const ac = new AbortController()
  req.on("close", () => ac.abort())

  try {
    const messages = req.body?.messages
    if (!Array.isArray(messages) || messages.length === 0) {
      return badRequest(res, "messages array is required")
    }

    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")
    res.flushHeaders?.()

    res.write(`event: status\ndata: ${JSON.stringify({ status: "thinking" })}\n\n`)

    const result = await runCopilotChat({
      messages,
      userId: req.user?._id,
      sessionId: req.body?.sessionId,
      itineraryId: req.body?.itineraryId,
      itinerarySnapshot: req.body?.itinerarySnapshot,
      signal: ac.signal,
    })

    if (ac.signal.aborted) {
      res.write(`event: cancelled\ndata: {}\n\n`)
      return res.end()
    }

    for (const chunk of chunkTextForStream(result.reply)) {
      if (ac.signal.aborted) break
      res.write(`event: token\ndata: ${JSON.stringify({ text: chunk })}\n\n`)
      await new Promise((r) => setTimeout(r, 18))
    }

    res.write(
      `event: done\ndata: ${JSON.stringify({
        planDraft: result.planDraft,
        cards: result.cards,
        followUps: result.followUps,
        quickActions: result.quickActions,
        itineraryUpdated: result.itineraryUpdated,
        itinerary: result.itinerary,
        sessionId: result.sessionId,
        demo: result.demo,
      })}\n\n`,
    )
    res.end()
  } catch (err) {
    if (!res.headersSent) return aiErrorResponse(res, err)
    res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`)
    res.end()
  }
}

/** GET /api/chat/sessions */
export const listSessions = async (req, res) => {
  try {
    const sessions = await ChatSession.find({ userId: req.user._id })
      .sort({ lastActiveAt: -1 })
      .limit(50)
      .select("title itineraryId lastActiveAt createdAt updatedAt")
      .lean()

    res.json({
      success: true,
      data: sessions.map((s) => ({
        id: String(s._id),
        title: s.title,
        itineraryId: s.itineraryId ? String(s.itineraryId) : null,
        lastActiveAt: s.lastActiveAt,
        createdAt: s.createdAt,
      })),
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** POST /api/chat/sessions */
export const createSession = async (req, res) => {
  try {
    const session = await ChatSession.create({
      userId: req.user._id,
      title: req.body?.title || "New chat",
      itineraryId: req.body?.itineraryId || null,
    })
    res.status(201).json({
      success: true,
      data: { id: String(session._id), title: session.title, itineraryId: session.itineraryId },
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** GET /api/chat/sessions/:id */
export const getSession = async (req, res) => {
  try {
    const session = await ChatSession.findOne({ _id: req.params.id, userId: req.user._id }).lean()
    if (!session) return res.status(404).json({ success: false, message: "Session not found" })
    res.json({
      success: true,
      data: {
        id: String(session._id),
        title: session.title,
        itineraryId: session.itineraryId ? String(session.itineraryId) : null,
        planDraft: session.planDraft,
        messages: session.messages,
      },
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** PATCH /api/chat/sessions/:id */
export const renameSession = async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim()
    if (!title) return badRequest(res, "title is required")
    const session = await ChatSession.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { title },
      { new: true },
    )
    if (!session) return res.status(404).json({ success: false, message: "Session not found" })
    res.json({ success: true, data: { id: String(session._id), title: session.title } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** DELETE /api/chat/sessions/:id */
export const deleteSession = async (req, res) => {
  try {
    const result = await ChatSession.deleteOne({ _id: req.params.id, userId: req.user._id })
    if (result.deletedCount === 0) return res.status(404).json({ success: false, message: "Session not found" })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** GET /api/chat/expenses/:itineraryId */
export const getExpenses = async (req, res) => {
  try {
    const summary = await loadExpenseSummary(req.user._id, req.params.itineraryId)
    res.json({ success: true, data: summary })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** POST /api/chat/expenses/:itineraryId */
export const addExpense = async (req, res) => {
  try {
    const expense = await createTripExpense(req.user._id, req.params.itineraryId, req.body)
    const summary = await loadExpenseSummary(req.user._id, req.params.itineraryId)
    res.status(201).json({ success: true, data: { expense, summary } })
  } catch (err) {
    if (err?.statusCode === 400) return badRequest(res, err.message)
    if (err?.statusCode === 404) return res.status(404).json({ success: false, message: err.message })
    res.status(500).json({ success: false, message: err.message })
  }
}

/** DELETE /api/chat/expenses/:itineraryId/:expenseId */
export const deleteExpense = async (req, res) => {
  try {
    await deleteTripExpense(req.user._id, req.params.itineraryId, req.params.expenseId)
    const summary = await loadExpenseSummary(req.user._id, req.params.itineraryId)
    res.json({ success: true, data: summary })
  } catch (err) {
    if (err?.statusCode === 404) return res.status(404).json({ success: false, message: err.message })
    res.status(500).json({ success: false, message: err.message })
  }
}
