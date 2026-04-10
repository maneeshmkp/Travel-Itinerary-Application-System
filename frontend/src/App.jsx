import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"
import ProtectedRoute from "./components/ProtectedRoute"
import PublicRoute from "./components/PublicRoute"
import Home from "./pages/Home"
import CreateItinerary from "./pages/CreateItinerary"
import Itineraries from "./pages/Itineraries"
import ItineraryDetail from "./pages/ItineraryDetail"
import SavedItineraries from "./pages/SavedItineraries"
import Recommendations from "./pages/Recommendations"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import ForgotPassword from "./pages/ForgotPassword"
import NotFound from "./pages/NotFound"
import SearchBar from "./pages/SearchBar"

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-background">
          <Navbar />
          <div className="px-4 py-2">
            <SearchBar />
          </div>
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <PublicRoute>
                    <Signup />
                  </PublicRoute>
                }
              />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route
                path="/create"
                element={
                  <ProtectedRoute>
                    <CreateItinerary />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/itineraries"
                element={
                  <ProtectedRoute>
                    <Itineraries />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/itineraries/:id"
                element={
                  <ProtectedRoute>
                    <ItineraryDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/saved"
                element={
                  <ProtectedRoute>
                    <SavedItineraries />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recommendations"
                element={
                  <ProtectedRoute>
                    <Recommendations />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  )
}

export default App
