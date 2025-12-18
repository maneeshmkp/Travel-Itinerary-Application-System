import axios from "axios"

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api"

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
    const token = localStorage.getItem("authToken")
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
    localStorage.removeItem("authToken")
    localStorage.removeItem("user")
  },

  // Set auth token
  setToken: (token) => {
    localStorage.setItem("authToken", token)
  },

  // Get auth token
  getToken: () => localStorage.getItem("authToken"),

  // Check if user is authenticated
  isAuthenticated: () => !!localStorage.getItem("authToken"),
}

// Health check
export const healthCheck = () => api.get("/health")

export default api
