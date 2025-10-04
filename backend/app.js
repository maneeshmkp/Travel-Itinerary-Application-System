import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import connectDB from "./config/db.js"
import errorHandler from "./middlewares/errorHandler.js"
import itineraryRoutes from "./routes/itineraryRoutes.js"
import recommendationRoutes from "./routes/recommendationRoutes.js"

// Load env vars
dotenv.config({
  path: './env'
}) 

// Connect to database
connectDB()

const app = express()

// Body parser middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))

// Enable CORS
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://your-frontend-domain.com"]
        : ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
  }),
)

// Health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Itinerary Builder API is running",
    timestamp: new Date().toISOString(),
  })
})

// Routes will be added here
app.use("/api/itineraries", itineraryRoutes)
app.use("/api/recommendations", recommendationRoutes)

// Error handler middleware
app.use(errorHandler)

// Handle 404
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  })
})

export default app
