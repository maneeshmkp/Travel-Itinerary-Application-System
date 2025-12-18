import app from "./app.js"

const PORT = process.env.PORT || 5000
 
const server = app.listen(PORT, "localhost", () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
  console.log(`Backend API available at http://localhost:${PORT}/api`)
})

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`)
  // Close server & exit process
  server.close(() => {
    process.exit(1)
  })
})
 