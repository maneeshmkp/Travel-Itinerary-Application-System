import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"
import Home from "./pages/Home"
import CreateItinerary from "./pages/CreateItinerary"
import Itineraries from "./pages/Itineraries"
import ItineraryDetail from "./pages/ItineraryDetail"
import Recommendations from "./pages/Recommendations"
import NotFound from "./pages/NotFound"
import SearchBar from "./pages/SearchBar"

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="px-4 py-2">
          {/* Add SearchBar here so it appears on all pages */}
          <SearchBar />
        </div>
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateItinerary />} />
            <Route path="/itineraries" element={<Itineraries />} />
            <Route path="/itineraries/:id" element={<ItineraryDetail />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App
