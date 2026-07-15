import mongoose from "mongoose"

const chatMessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "assistant", "system"], required: true },
    content: { type: String, default: "" },
    cards: { type: mongoose.Schema.Types.Mixed, default: [] },
    quickActions: { type: mongoose.Schema.Types.Mixed, default: [] },
    followUps: { type: [String], default: [] },
    planDraft: { type: mongoose.Schema.Types.Mixed, default: null },
    toolResults: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: true, timestamps: true },
)

const chatSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, trim: true, default: "New chat" },
    itineraryId: { type: mongoose.Schema.Types.ObjectId, ref: "Itinerary", default: null },
    planDraft: { type: mongoose.Schema.Types.Mixed, default: null },
    messages: { type: [chatMessageSchema], default: [] },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

chatSessionSchema.index({ userId: 1, lastActiveAt: -1 })

const ChatSession = mongoose.model("ChatSession", chatSessionSchema)
export default ChatSession
