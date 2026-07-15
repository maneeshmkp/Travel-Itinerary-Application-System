import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom"
import { Suspense, lazy } from "react"
import { AuthProvider } from "./context/AuthContext"
import { NotificationRealtimeProvider } from "./context/NotificationRealtimeContext"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"
import ProtectedRoute from "./components/ProtectedRoute"
import PublicRoute from "./components/PublicRoute"
import AdminRoute from "./components/AdminRoute"
import SuperAdminRoute from "./components/SuperAdminRoute"
import { AskAiProvider } from "./context/AskAiContext"
import { OfflineProvider } from "./context/OfflineContext"
import AskAiDialog from "./components/askAi/AskAiDialog"
import OfflineBanner from "./components/offline/OfflineBanner"
import NotificationLiveToasts from "./components/notifications/NotificationLiveToasts"

/** Route-level code splitting — heavy pages (admin, maps, analytics, chat) load on demand */
const Home = lazy(() => import("./pages/Home"))
const CreateItinerary = lazy(() => import("./pages/CreateItinerary"))
const Itineraries = lazy(() => import("./pages/Itineraries"))
const ItineraryDetail = lazy(() => import("./pages/ItineraryDetail"))
const SavedItineraries = lazy(() => import("./pages/SavedItineraries"))
const Recommendations = lazy(() => import("./pages/Recommendations"))
const Login = lazy(() => import("./pages/Login"))
const Signup = lazy(() => import("./pages/Signup"))
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"))
const ResetPassword = lazy(() => import("./pages/ResetPassword"))
const NotFound = lazy(() => import("./pages/NotFound"))
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"))
const TermsOfService = lazy(() => import("./pages/TermsOfService"))
const MapDemo = lazy(() => import("./pages/MapDemo"))
const AiPersonalizedItinerary = lazy(() => import("./pages/AiPersonalizedItinerary"))
const ChatAssistant = lazy(() => import("./pages/ChatAssistant"))
const Blogs = lazy(() => import("./pages/Blogs"))
const BlogDetail = lazy(() => import("./pages/BlogDetail"))
const NotificationCenter = lazy(() => import("./pages/NotificationCenter"))
const SystemMonitoring = lazy(() => import("./pages/SystemMonitoring"))
const OfflineSettings = lazy(() => import("./components/offline/OfflineSettings"))
const BookingsHub = lazy(() => import("./pages/BookingsHub"))
const BookingDetailPage = lazy(() => import("./pages/BookingDetailPage"))
const CalendarSettings = lazy(() => import("./components/calendar/CalendarSettings"))
const DocumentsHub = lazy(() => import("./pages/DocumentsHub"))
const TravelAnalyticsPage = lazy(() => import("./pages/TravelAnalyticsPage"))
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"))
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"))
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"))
const AdminEvents = lazy(() => import("./pages/admin/AdminEvents"))
const AdminQueues = lazy(() => import("./pages/admin/AdminQueues"))
const AdminTenants = lazy(() => import("./pages/admin/AdminTenants"))
const AdminSecurity = lazy(() => import("./pages/admin/AdminSecurity"))
const AdminTrips = lazy(() =>
  import("./pages/admin/AdminResources").then((m) => ({ default: m.AdminTrips })),
)
const AdminBookings = lazy(() =>
  import("./pages/admin/AdminResources").then((m) => ({ default: m.AdminBookings })),
)
const AdminDocuments = lazy(() =>
  import("./pages/admin/AdminResources").then((m) => ({ default: m.AdminDocuments })),
)
const AdminAnalytics = lazy(() =>
  import("./pages/admin/AdminMisc").then((m) => ({ default: m.AdminAnalytics })),
)
const AdminNotifications = lazy(() =>
  import("./pages/admin/AdminMisc").then((m) => ({ default: m.AdminNotifications })),
)
const AdminRoles = lazy(() =>
  import("./pages/admin/AdminMisc").then((m) => ({ default: m.AdminRoles })),
)
const AdminSettings = lazy(() =>
  import("./pages/admin/AdminMisc").then((m) => ({ default: m.AdminSettings })),
)

function RouteFallback() {
  return (
    <div className="flex flex-1 items-center justify-center py-24 text-sm text-muted-foreground">
      Loading…
    </div>
  )
}

function AppShell() {
  const location = useLocation()
  const isChatPage = location.pathname === "/chat"
  const isAdminPage =
    location.pathname.startsWith("/admin") || location.pathname.startsWith("/super-admin")
  const isWorkspaceItinerary = /^\/itineraries\/[^/]+$/.test(location.pathname)
  const mobileNavPad = !isChatPage && !isWorkspaceItinerary && !isAdminPage

  return (
    <div
      className={`min-h-screen flex flex-col bg-background ${
        isChatPage ? "h-dvh max-h-dvh overflow-hidden" : ""
      } ${mobileNavPad ? "pb-16 md:pb-0" : ""}`}
    >
      {!isAdminPage && <Navbar />}
      <OfflineBanner />
      <main className={isChatPage ? "flex-1 flex flex-col min-h-0 overflow-hidden" : "flex-1"}>
        <div className={isChatPage ? "flex flex-col flex-1 min-h-0" : undefined}>
          <Suspense fallback={<RouteFallback />}>
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
          <Route path="/reset-password/:resetToken" element={<ResetPassword />} />
          <Route path="/map-demo" element={<MapDemo />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/blogs" element={<Blogs />} />
          <Route path="/blogs/:slug" element={<BlogDetail />} />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <div className="flex flex-col flex-1 min-h-0 h-full">
                  <ChatAssistant />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-itinerary"
            element={
              <ProtectedRoute>
                <AiPersonalizedItinerary />
              </ProtectedRoute>
            }
          />
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
            path="/offline-settings"
            element={
              <ProtectedRoute>
                <OfflineSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <BookingsHub />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookings/:id"
            element={
              <ProtectedRoute>
                <BookingDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar-settings"
            element={
              <ProtectedRoute>
                <CalendarSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <DocumentsHub />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <TravelAnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationCenter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout variant="admin" />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="trips" element={<AdminTrips />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="documents" element={<AdminDocuments />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="monitoring" element={<SystemMonitoring />} />
            <Route path="events" element={<AdminEvents />} />
            <Route path="queues" element={<AdminQueues />} />
            <Route path="security" element={<AdminSecurity />} />
            <Route path="notifications" element={<AdminNotifications />} />
          </Route>
          <Route
            path="/super-admin"
            element={
              <SuperAdminRoute>
                <AdminLayout variant="super" />
              </SuperAdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="tenants" element={<AdminTenants />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="trips" element={<AdminTrips />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="documents" element={<AdminDocuments />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="monitoring" element={<SystemMonitoring />} />
            <Route path="events" element={<AdminEvents />} />
            <Route path="queues" element={<AdminQueues />} />
            <Route path="security" element={<AdminSecurity />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="roles" element={<AdminRoles />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
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
          </Suspense>
        </div>
      </main>
      {!isChatPage && !isAdminPage && <Footer />}
    </div>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <OfflineProvider>
          <AskAiProvider>
            <NotificationRealtimeProvider>
              <AppShell />
              <AskAiDialog />
              <NotificationLiveToasts />
            </NotificationRealtimeProvider>
          </AskAiProvider>
        </OfflineProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
