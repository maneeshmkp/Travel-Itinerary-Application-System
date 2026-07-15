/** Shared constants for the public product landing page (no backend calls). */

export const GITHUB_URL =
  import.meta.env.VITE_GITHUB_URL ||
  "https://github.com/maneeshmkp/Travel-Itinerary-Application-System"

export const LINKEDIN_URL =
  import.meta.env.VITE_LINKEDIN_URL || "https://www.linkedin.com/"

export const CONTACT_EMAIL =
  import.meta.env.VITE_CONTACT_EMAIL || "hello@travelplan.app"

export const DEMO_PATH = "/itineraries"

export const LANDING_FEATURES = [
  {
    id: "ai-planner",
    title: "AI Planner",
    description: "Generate day-by-day itineraries tailored to nights, budget, and travel style.",
    icon: "Sparkles",
    to: "/ai-itinerary",
  },
  {
    id: "copilot",
    title: "AI Copilot",
    description: "Ask travel questions with tool-aware chat for weather, maps, and trip edits.",
    icon: "Bot",
    to: "/chat",
  },
  {
    id: "expenses",
    title: "Expense Tracker",
    description: "Log spend by category, currency, and trip—with budget awareness built in.",
    icon: "Wallet",
    to: "/itineraries",
  },
  {
    id: "bookings",
    title: "Bookings",
    description: "Track flights, hotels, trains, and activities linked to every trip.",
    icon: "Ticket",
    to: "/bookings",
  },
  {
    id: "flights",
    title: "Flight Tracking",
    description: "Live status, delays, and gate updates wired into notifications.",
    icon: "Plane",
    to: "/bookings",
  },
  {
    id: "maps",
    title: "Maps",
    description: "Google Maps with Leaflet fallback for days, activities, and routes.",
    icon: "Map",
    to: "/map-demo",
  },
  {
    id: "weather",
    title: "Weather",
    description: "OpenWeather forecasts for destinations and activities—cached for speed.",
    icon: "CloudSun",
    to: "/recommendations",
  },
  {
    id: "vault",
    title: "Document Vault",
    description: "Passports and tickets in a secure vault with AWS S3 when configured.",
    icon: "FileLock2",
    to: "/documents",
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Realtime Socket.IO alerts for reminders, collaborators, and flights.",
    icon: "Bell",
    to: "/notifications",
  },
  {
    id: "analytics",
    title: "Analytics",
    description: "Personal travel insights and charts across trips, spend, and bookings.",
    icon: "BarChart3",
    to: "/analytics",
  },
]

export const TECH_STACK = [
  { name: "MongoDB", color: "#47A248" },
  { name: "Express", color: "#000000" },
  { name: "React", color: "#61DAFB" },
  { name: "Node.js", color: "#339933" },
  { name: "Redis", color: "#DC382D" },
  { name: "BullMQ", color: "#FF4757" },
  { name: "Socket.IO", color: "#010101" },
  { name: "JWT", color: "#000000" },
  { name: "Docker", color: "#2496ED" },
  { name: "GitHub Actions", color: "#2088FF" },
  { name: "AWS S3", color: "#FF9900" },
  { name: "OpenAI / Gemini", color: "#10A37F" },
  { name: "Google Maps", color: "#4285F4" },
  { name: "OpenWeather", color: "#EB6E4B" },
  { name: "Playwright", color: "#2EAD33" },
  { name: "OpenAPI", color: "#6BA539" },
]

export const OPS_PILLARS = [
  {
    title: "Redis",
    description: "Cache-aside, rate limits, Socket.IO adapter, and BullMQ backbone.",
    icon: "Database",
  },
  {
    title: "Docker",
    description: "Compose stack for API, SPA, Mongo, and Redis—one command local parity.",
    icon: "Container",
  },
  {
    title: "CI/CD",
    description: "GitHub Actions for lint, tests, Docker build, and deploy pipelines.",
    icon: "GitBranch",
  },
  {
    title: "Playwright",
    description: "Critical-path E2E coverage for auth, trips, and booking flows.",
    icon: "TestTube2",
  },
  {
    title: "Monitoring",
    description: "Health, P95 latency, Redis hit ratio, and Mongo timings in Admin.",
    icon: "Activity",
  },
  {
    title: "AWS S3",
    description: "Private document storage with signed access when S3 is enabled.",
    icon: "HardDrive",
  },
]

export const SECURITY_ITEMS = [
  { title: "JWT", description: "Access tokens plus refresh rotation and device sessions." },
  { title: "RBAC", description: "Roles from Guest to Super Admin with permission checks." },
  { title: "Rate limiting", description: "Redis-backed limits on auth, AI, and public APIs." },
  { title: "Helmet", description: "Security headers, CSP posture, and production HSTS." },
]

export const CLOUD_ITEMS = [
  { title: "Render", description: "API hosting with health checks and Redis attachments.", icon: "Server" },
  { title: "Vercel", description: "SPA deploy with environment-scoped API base URL.", icon: "Globe" },
  { title: "MongoDB Atlas", description: "Managed database for production itineraries and users.", icon: "Database" },
  { title: "AWS S3", description: "Object storage for the travel document vault.", icon: "Cloud" },
]

export const DOC_LINKS = [
  { title: "GitHub", description: "Source code and releases", href: GITHUB_URL, external: true },
  { title: "Swagger", description: "Interactive OpenAPI explorer", href: "/docs", external: true, apiRelative: true },
  {
    title: "OpenAPI JSON",
    description: "Machine-readable API specification",
    href: "/docs/openapi.json",
    external: true,
    apiRelative: true,
  },
  {
    title: "Live health",
    description: "API liveness probe",
    href: "/api/health/live",
    external: true,
    apiRelative: true,
  },
]

export const SCREENSHOTS = [
  {
    id: "trips",
    title: "Browse itineraries",
    caption: "Search and filter community and workspace trips.",
    src: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=70",
    alt: "Travel planning workspace aesthetic",
  },
  {
    id: "maps",
    title: "Maps & places",
    caption: "Visualize days with Google Maps or Leaflet.",
    src: "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=70",
    alt: "Map of a coastal destination",
  },
  {
    id: "docs",
    title: "Document vault",
    caption: "Keep tickets and IDs organized securely.",
    src: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=1200&q=70",
    alt: "Organized travel documents on a desk",
  },
  {
    id: "analytics",
    title: "Travel analytics",
    caption: "Understand spend and trip patterns over time.",
    src: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=70",
    alt: "Analytics charts on a desk",
  },
]
