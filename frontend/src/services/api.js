import axios from "axios"

/** Ensures requests hit /api/... even when VITE_API_URL is set to http://host:port without /api */
function resolveApiBaseUrl() {
  const raw = import.meta.env.VITE_API_URL?.trim()
  if (!raw) {
    // Dev: same-origin /api → Vite proxy → backend (avoids CORS and stale direct-to-wrong-port issues)
    if (import.meta.env.DEV) return "/api"
    return "http://localhost:8000/api"
  }
  const noTrail = raw.replace(/\/+$/, "")
  if (noTrail.endsWith("/api")) return noTrail
  return `${noTrail}/api`
}

const API_BASE_URL = resolveApiBaseUrl()

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 second timeout
}) 

// Request interceptor - Add token to all requests
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`)
    
    // Add token to headers if available
    const token = localStorage.getItem("token") || localStorage.getItem("authToken")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
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
      error.message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "The requested resource was not found."
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

  // Autocomplete (min ~2 chars recommended)
  getSuggestions: (search) =>
    api.get("/itineraries/suggestions", { params: { search } }),

  // Get single itinerary by ID
  getById: (id) => api.get(`/itineraries/${id}`),

  // Create new itinerary
  create: (data) => api.post("/itineraries", data),

  // Update itinerary
  update: (id, data) => api.put(`/itineraries/${id}`, data),

  // Delete itinerary
  delete: (id) => api.delete(`/itineraries/${id}`),

  // Saved itineraries (auth required)
  saveForUser: (id) => api.post(`/itineraries/${id}/save`),
  unsaveForUser: (id) => api.delete(`/itineraries/${id}/save`),
  checkSaved: (id) => api.get(`/itineraries/${id}/saved`),
  /** List saved trips (auth). Uses GET /api/itineraries/saved */
  getMySaved: () => api.get("/itineraries/saved"),
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

// Authentication API calls
export const authAPI = {
  // Sign up new user
  signup: (data) => api.post("/auth/signup", data),

  // Login user
  login: (data) => api.post("/auth/login", data),

  // Forgot password - send reset link
  forgotPassword: (data) => api.post("/auth/forgot-password", data),

  // Reset password with token
  resetPassword: (token, data) => api.post(`/auth/reset-password/${token}`, data),

  // Get current user info
  getCurrentUser: () => api.get("/auth/me"),

  // Logout (frontend only - clears token)
  logout: () => {
    localStorage.removeItem("token")
    localStorage.removeItem("authToken")
    localStorage.removeItem("user")
  },

  // Set auth token
  setToken: (token) => {
    localStorage.setItem("token", token)
    localStorage.removeItem("authToken")
  },

  // Get auth token
  getToken: () => localStorage.getItem("token") || localStorage.getItem("authToken"),

  // Check if user is authenticated
  isAuthenticated: () => !!(localStorage.getItem("token") || localStorage.getItem("authToken")),
}

// Health check
export const healthCheck = () => api.get("/health")

export default api
