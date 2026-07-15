import "dotenv/config"
import mongoose from "mongoose"
import User from "../models/User.js"

const target = (process.argv[2] || "").toLowerCase().trim()

await mongoose.connect(process.env.MONGO_URI)

if (target) {
  let user = await User.findOne({ email: target })
  if (!user) {
    const fuzzy = await User.find({ email: /12212016/i }).select("name email role status").lean()
    console.error("User not found:", target)
    console.log(JSON.stringify({ suggestions: fuzzy }, null, 2))
    process.exit(1)
  }
  const before = user.role
  user.role = "super_admin"
  await user.save()
  console.log(JSON.stringify({ ok: true, email: user.email, before, after: user.role }, null, 2))
} else {
  const fuzzy = await User.find({ email: /12212016/i }).select("name email role status").lean()
  const admins = await User.find({ role: { $in: ["admin", "super_admin"] } })
    .select("name email role status")
    .lean()
  console.log(JSON.stringify({ admins, fuzzy }, null, 2))
}

await mongoose.disconnect()
