import axios from "axios"

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 second timeout
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`)
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    console.error("API Error:", error.response?.data || error.message)

    if (error.code === "ECONNABORTED") {
      error.message = "Request timed out. Please check your connection and try again."
    } else if (error.response?.status === 404) {
      error.message = "The requested resource was not found."
    } else if (error.response?.status === 500) {
      error.message = "Server error. Please try again later."
    } else if (!error.response) {
      error.message = "Network error. Please check your connection."
    }

    return Promise.reject(error)
  },
)

// Itinerary API calls
export const itineraryAPI = {
  // Get all itineraries with optional filters
  getAll: (params = {}) => api.get("/itineraries", { params }),

  // Get single itinerary by ID
  getById: (id) => api.get(`/itineraries/${id}`),

  // Create new itinerary
  create: (data) => api.post("/itineraries", data),

  // Update itinerary
  update: (id, data) => api.put(`/itineraries/${id}`, data),

  // Delete itinerary
  delete: (id) => api.delete(`/itineraries/${id}`),
}

// Recommendation API calls
export const recommendationAPI = {
  // Get recommendations based on criteria
  getRecommendations: (params = {}) => api.get("/recommendations", { params }),

  // Get available destinations
  getDestinations: () => api.get("/recommendations/destinations"),

  // Get similar itineraries
  getSimilar: (id) => api.get(`/recommendations/similar/${id}`),
}

// Health check
export const healthCheck = () => api.get("/health")

export default api
