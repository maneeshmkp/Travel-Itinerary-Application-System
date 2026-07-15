import mongoose from "mongoose"

const systemSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, default: {} },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
)

const SystemSettings = mongoose.model("SystemSettings", systemSettingsSchema)
export default SystemSettings
