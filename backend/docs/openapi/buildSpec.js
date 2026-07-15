/**
 * OpenAPI 3.1 specification builder for TravelPlan API.
 * Source of truth for Swagger UI, Postman export, and SDK generation.
 */
const bearer = [{ bearerAuth: [] }]

function op(summary, opts = {}) {
  const {
    description = summary,
    tags = [],
    security,
    parameters = [],
    requestBody,
    responses,
    operationId,
  } = opts
  const out = {
    summary,
    description,
    tags,
    parameters,
    responses: responses || {
      200: { description: "Success", content: json(ref("SuccessResponse")) },
      400: { description: "Bad request", content: json(ref("ErrorResponse")) },
      401: { description: "Unauthorized", content: json(ref("ErrorResponse")) },
      404: { description: "Not found", content: json(ref("ErrorResponse")) },
      429: { description: "Rate limited", content: json(ref("ErrorResponse")) },
      500: { description: "Server error", content: json(ref("ErrorResponse")) },
    },
  }
  if (operationId) out.operationId = operationId
  if (security !== undefined) out.security = security
  else if (opts.auth) out.security = bearer
  if (requestBody) out.requestBody = requestBody
  return out
}

function json(schema) {
  return { "application/json": { schema } }
}

function ref(name) {
  return { $ref: `#/components/schemas/${name}` }
}

function body(schemaName, example) {
  return {
    required: true,
    content: {
      "application/json": {
        schema: typeof schemaName === "string" ? ref(schemaName) : schemaName,
        ...(example ? { example } : {}),
      },
    },
  }
}

function pathParam(name, description = `${name} identifier`, example = "507f1f77bcf86cd799439011") {
  return {
    name,
    in: "path",
    required: true,
    description,
    schema: { type: "string", example },
  }
}

function query(name, description, schema = { type: "string" }, required = false) {
  return { name, in: "query", required, description, schema }
}

export function buildOpenApiDocument() {
  return {
    openapi: "3.1.0",
    info: {
      title: "TravelPlan API",
      version: "1.0.0",
      description: `
# TravelPlan Public API

Production-grade AI travel management API.

## Versioning

- **Current:** \`/api/v1\`
- **Legacy (compatible):** \`/api\` (same handlers; receives \`X-API-Version: 1\`)

Prefer \`/api/v1\` for all new integrations.

## Authentication

Most endpoints require a JWT Bearer token from \`POST /api/v1/auth/login\` or signup.

\`\`\`
Authorization: Bearer <token>
\`\`\`

Admin monitoring APIs additionally require an admin role (\`User.role=admin\` or \`ADMIN_EMAILS\`).

## Rate limits

Redis-backed limits (fail-open if Redis is down):

| Scope | Limit |
|-------|-------|
| Login | 10 / minute |
| Signup | 10 / minute |
| Forgot password | 5 / minute |
| AI endpoints | 20 / hour |
| Public weather | 60 / minute |

Responses may include \`X-RateLimit-*\` headers. HTTP **429** when exceeded.

## Errors

Error bodies use:

\`\`\`json
{ "success": false, "code": "ERROR_CODE", "message": "Human readable", "error": "..." }
\`\`\`
      `.trim(),
      contact: { name: "TravelPlan API", email: "hello@travelplan.com" },
      license: { name: "Proprietary", identifier: "LicenseRef-TravelPlan-Proprietary" },
    },
    servers: [
      { url: "http://localhost:5000", description: "Local development (paths include /api/v1)" },
      { url: "https://api.travelplan.example", description: "Production host (example)" },
    ],
    tags: [
      { name: "Health", description: "Liveness and dependency health" },
      { name: "Authentication", description: "Signup, login, password reset, current user" },
      { name: "Trips", description: "Itineraries / trips CRUD, save, collaborate, expenses on trips" },
      { name: "Bookings", description: "Flight/hotel/activity booking tracker" },
      { name: "Expenses", description: "Trip expense tracker (via itineraries)" },
      { name: "Documents", description: "Travel document vault (S3)" },
      { name: "Notifications", description: "In-app notifications and settings" },
      { name: "Weather", description: "Current weather and forecasts (cached)" },
      { name: "Maps", description: "Nearby places / map recommendations" },
      { name: "Recommendations", description: "Destination and trip recommendations" },
      { name: "Analytics", description: "Travel analytics dashboard and exports" },
      { name: "AI", description: "AI itinerary, enrichment, and copilots (rate limited)" },
      { name: "Copilot", description: "Travel Copilot chat sessions" },
      { name: "Flight Tracking", description: "Live flight status and tracking" },
      { name: "Calendar", description: "Google / Outlook calendar sync" },
      { name: "Packing", description: "AI packing lists" },
      { name: "Risk", description: "Trip risk analysis" },
      { name: "Budget", description: "AI budget optimizer" },
      { name: "Availability", description: "Hotel/flight/train/bus/activity search" },
      { name: "Blogs", description: "Public travel blogs" },
      { name: "Monitoring", description: "Admin-only observability" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT from /auth/login or /auth/signup. Send as `Authorization: Bearer <token>`.",
        },
      },
      schemas: {
        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string" },
            data: {},
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            code: { type: "string", example: "UNAUTHORIZED" },
            message: { type: "string" },
            error: { type: "string" },
          },
        },
        User: {
          type: "object",
          properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439011" },
            name: { type: "string", example: "Ada Lovelace" },
            email: { type: "string", format: "email", example: "ada@example.com" },
            role: { type: "string", enum: ["user", "admin"], example: "user" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        AuthTokenResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string" },
            token: { type: "string", description: "JWT access token" },
            user: ref("User"),
          },
        },
        Trip: {
          type: "object",
          description: "Itinerary / trip document",
          properties: {
            _id: { type: "string" },
            title: { type: "string", example: "Tokyo Spring Escape" },
            destination: { type: "string", example: "Tokyo, Japan" },
            numberOfNights: { type: "integer", example: 4 },
            totalDays: { type: "integer", example: 5 },
            description: { type: "string" },
            budget: {
              type: "object",
              properties: {
                min: { type: "number" },
                max: { type: "number" },
                currency: { type: "string", example: "USD" },
              },
            },
            highlights: { type: "array", items: { type: "string" } },
            tags: { type: "array", items: { type: "string" } },
            days: { type: "array", items: { type: "object" } },
            ownerId: { type: "string" },
            collaboration: { type: "object" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Booking: {
          type: "object",
          properties: {
            _id: { type: "string" },
            tripId: { type: "string" },
            bookingType: { type: "string", enum: ["flight", "hotel", "activity", "train", "bus", "other"] },
            provider: { type: "string", example: "Air India" },
            bookingReference: { type: "string" },
            confirmationNumber: { type: "string" },
            status: { type: "string" },
            paymentStatus: { type: "string" },
            price: { type: "number" },
            currency: { type: "string" },
            flightNumber: { type: "string" },
            checkIn: { type: "string", format: "date-time" },
            checkOut: { type: "string", format: "date-time" },
            departureDate: { type: "string", format: "date-time" },
          },
        },
        Expense: {
          type: "object",
          properties: {
            _id: { type: "string" },
            itineraryId: { type: "string" },
            userId: { type: "string" },
            amount: { type: "number", example: 42.5 },
            currency: { type: "string", example: "USD" },
            category: { type: "string", example: "food" },
            description: { type: "string", example: "Lunch at café" },
            dayNumber: { type: "integer" },
            paymentMethod: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Notification: {
          type: "object",
          properties: {
            id: { type: "string" },
            type: { type: "string", example: "TRIP_CREATED" },
            category: { type: "string" },
            title: { type: "string" },
            message: { type: "string" },
            priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
            status: { type: "string", enum: ["UNREAD", "READ", "ARCHIVED"] },
            read: { type: "boolean" },
            actionUrl: { type: "string" },
            trip: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Document: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string", example: "Passport scan" },
            documentType: { type: "string", example: "passport" },
            tripId: { type: "string", nullable: true },
            country: { type: "string" },
            expiryDate: { type: "string", format: "date-time", nullable: true },
            isFavorite: { type: "boolean" },
            mimeType: { type: "string" },
            storageProvider: { type: "string", example: "s3" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Weather: {
          type: "object",
          properties: {
            destination: { type: "string" },
            location: { type: "string" },
            date: { type: "string", format: "date" },
            condition: { type: "string", example: "Clear" },
            tempC: { type: "number" },
            humidity: { type: "number" },
            demo: { type: "boolean" },
          },
        },
        Analytics: {
          type: "object",
          properties: {
            exists: { type: "boolean" },
            totalTrips: { type: "integer" },
            travelScore: { type: "number" },
            totalSpent: { type: "number" },
            charts: { type: "object" },
            heatmap: { type: "array", items: { type: "object" } },
            insights: { type: "array", items: { type: "string" } },
          },
        },
        AIResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            demo: { type: "boolean", description: "True when demo/fallback model used" },
            data: { type: "object" },
            message: { type: "string" },
          },
        },
        SignupRequest: {
          type: "object",
          required: ["name", "email", "password", "confirmPassword"],
          properties: {
            name: { type: "string", minLength: 2, example: "Ada Lovelace" },
            email: { type: "string", format: "email", example: "ada@example.com" },
            password: { type: "string", minLength: 6, example: "Secret123!" },
            confirmPassword: { type: "string", minLength: 6, example: "Secret123!" },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "ada@example.com" },
            password: { type: "string", example: "Secret123!" },
          },
        },
        CreateBookingRequest: {
          type: "object",
          required: ["tripId", "bookingType"],
          properties: {
            tripId: { type: "string" },
            bookingType: { type: "string", enum: ["flight", "hotel", "activity", "train", "bus", "other"] },
            provider: { type: "string" },
            bookingReference: { type: "string" },
            price: { type: "number" },
            currency: { type: "string" },
            flightNumber: { type: "string" },
          },
        },
        CreateExpenseRequest: {
          type: "object",
          required: ["amount"],
          properties: {
            amount: { type: "number", example: 25 },
            currency: { type: "string", example: "USD" },
            category: { type: "string", example: "food" },
            description: { type: "string" },
            dayNumber: { type: "integer", example: 1 },
            paymentMethod: { type: "string", example: "card" },
          },
        },
        HealthResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            status: { type: "string", enum: ["healthy", "degraded", "unhealthy"] },
            color: { type: "string" },
            timestamp: { type: "string", format: "date-time" },
            services: { type: "object" },
            memory: { type: "object" },
            metrics: { type: "object" },
          },
        },
      },
      parameters: {
        ObjectId: {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
        },
      },
    },
    paths: buildPaths(),
  }
}

function buildPaths() {
  const p = {}

  // —— Health ——
  p["/health"] = {
    get: op("Root health check", {
      tags: ["Health"],
      security: [],
      operationId: "getRootHealth",
      responses: { 200: { description: "OK", content: json(ref("HealthResponse")) } },
    }),
  }
  p["/api/health"] = {
    get: op("Legacy API health", {
      tags: ["Health"],
      security: [],
      operationId: "getApiHealth",
      responses: { 200: { description: "OK", content: json(ref("HealthResponse")) } },
    }),
  }
  p["/api/v1/health"] = {
    get: op("API v1 health", {
      tags: ["Health"],
      security: [],
      operationId: "getV1Health",
      description: "Preferred health endpoint for v1 clients.",
      responses: { 200: { description: "OK", content: json(ref("HealthResponse")) } },
    }),
  }

  // —— Auth ——
  const auth = (path, methods) => {
    p[`/api/v1/auth${path}`] = methods
    p[`/api/auth${path}`] = legacyMirror(methods)
  }
  auth("/signup", {
    post: op("Sign up", {
      tags: ["Authentication"],
      security: [],
      operationId: "signup",
      requestBody: body("SignupRequest"),
      responses: {
        201: { description: "Account created", content: json(ref("AuthTokenResponse")) },
        400: { description: "Validation error", content: json(ref("ErrorResponse")) },
        429: { description: "Rate limited", content: json(ref("ErrorResponse")) },
      },
    }),
  })
  auth("/login", {
    post: op("Login", {
      tags: ["Authentication"],
      security: [],
      operationId: "login",
      description: "Returns JWT. Rate limit: 10/min.",
      requestBody: body("LoginRequest"),
      responses: {
        200: { description: "Logged in", content: json(ref("AuthTokenResponse")) },
        401: { description: "Invalid credentials", content: json(ref("ErrorResponse")) },
        429: { description: "Rate limited", content: json(ref("ErrorResponse")) },
      },
    }),
  })
  auth("/forgot-password", {
    post: op("Forgot password", {
      tags: ["Authentication"],
      security: [],
      operationId: "forgotPassword",
      requestBody: body({
        type: "object",
        required: ["email"],
        properties: { email: { type: "string", format: "email" } },
      }),
    }),
  })
  auth("/reset-password/{resetToken}", {
    post: op("Reset password", {
      tags: ["Authentication"],
      security: [],
      operationId: "resetPassword",
      parameters: [pathParam("resetToken", "Password reset token", "abc123")],
      requestBody: body({
        type: "object",
        required: ["password", "confirmPassword"],
        properties: {
          password: { type: "string", minLength: 6 },
          confirmPassword: { type: "string", minLength: 6 },
        },
      }),
    }),
  })
  auth("/me", {
    get: op("Current user", {
      tags: ["Authentication"],
      auth: true,
      operationId: "getCurrentUser",
      responses: {
        200: {
          description: "Current user",
          content: json({
            type: "object",
            properties: { success: { type: "boolean" }, user: ref("User") },
          }),
        },
        401: { description: "Unauthorized", content: json(ref("ErrorResponse")) },
      },
    }),
  })

  // —— Trips / Itineraries ——
  mirror("/api/v1/itineraries", "/api/itineraries", {
    get: op("List trips", {
      tags: ["Trips"],
      auth: true,
      operationId: "listItineraries",
      parameters: [
        query("destination", "Filter by destination"),
        query("search", "Free-text search"),
        query("page", "Page number", { type: "integer", default: 1 }),
        query("limit", "Page size", { type: "integer", default: 10 }),
      ],
      responses: {
        200: {
          description: "Paginated trips",
          content: json({
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: { type: "array", items: ref("Trip") },
            },
          }),
        },
      },
    }),
    post: op("Create trip", {
      tags: ["Trips"],
      auth: true,
      operationId: "createItinerary",
      description: "JWT optional via optionalProtect but recommended. Creates itinerary with days/activities.",
      requestBody: body(ref("Trip"), {
        title: "Tokyo Spring Escape",
        destination: "Tokyo, Japan",
        numberOfNights: 3,
        description: "Cherry blossoms and city walks",
        days: [
          {
            dayNumber: 1,
            hotel: { name: "Park Hotel", location: "Shinjuku" },
            activities: [
              {
                name: "Senso-ji",
                location: "Asakusa",
                description: "Visit the temple",
                category: "sightseeing",
              },
            ],
          },
        ],
      }),
      responses: {
        201: { description: "Created", content: json({ type: "object", properties: { success: { type: "boolean" }, data: ref("Trip") } }) },
      },
    }),
  })

  addBoth("/itineraries/suggestions", {
    get: op("Search suggestions", {
      tags: ["Trips"],
      auth: true,
      operationId: "getSearchSuggestions",
      parameters: [query("q", "Search query", { type: "string", minLength: 2 }, true)],
    }),
  })
  addBoth("/itineraries/saved", {
    get: op("Saved trips", { tags: ["Trips"], auth: true, operationId: "getSavedItineraries" }),
  })
  addBoth("/itineraries/saved/mine", {
    get: op("My saved trips", { tags: ["Trips"], auth: true, operationId: "getSavedItinerariesMine" }),
  })
  addBoth("/itineraries/{id}", {
    get: op("Get trip", {
      tags: ["Trips"],
      auth: true,
      operationId: "getItinerary",
      parameters: [pathParam("id")],
      responses: {
        200: { description: "Trip", content: json({ type: "object", properties: { success: { type: "boolean" }, data: ref("Trip") } }) },
      },
    }),
    put: op("Update trip", {
      tags: ["Trips"],
      auth: true,
      operationId: "updateItinerary",
      parameters: [pathParam("id")],
      requestBody: body(ref("Trip")),
    }),
    delete: op("Delete trip", {
      tags: ["Trips"],
      operationId: "deleteItinerary",
      parameters: [pathParam("id")],
    }),
  })
  addBoth("/itineraries/{id}/save", {
    post: op("Favorite trip", { tags: ["Trips"], auth: true, operationId: "saveItinerary", parameters: [pathParam("id")] }),
    delete: op("Unfavorite trip", { tags: ["Trips"], auth: true, operationId: "unsaveItinerary", parameters: [pathParam("id")] }),
  })
  addBoth("/itineraries/{id}/collaborate/enable", {
    post: op("Enable collaboration", { tags: ["Trips"], auth: true, operationId: "enableCollaboration", parameters: [pathParam("id")] }),
  })
  addBoth("/itineraries/{id}/collaborate/join", {
    post: op("Join collaboration", {
      tags: ["Trips"],
      auth: true,
      operationId: "joinCollaboration",
      parameters: [pathParam("id")],
      requestBody: body({ type: "object", properties: { token: { type: "string" } } }),
    }),
  })
  addBoth("/itineraries/{id}/optimize", {
    post: op("AI optimize schedule", { tags: ["Trips", "AI"], auth: true, operationId: "optimizeItinerary", parameters: [pathParam("id")] }),
  })
  addBoth("/itineraries/{id}/pdf", {
    get: op("Export trip PDF", { tags: ["Trips"], security: [], operationId: "exportItineraryPdf", parameters: [pathParam("id")] }),
  })

  // Expenses on trip
  addBoth("/itineraries/{id}/expenses", {
    get: op("List expenses", {
      tags: ["Expenses"],
      auth: true,
      operationId: "listExpenses",
      parameters: [pathParam("id", "Trip ID")],
      responses: {
        200: {
          description: "Expenses",
          content: json({
            type: "object",
            properties: { success: { type: "boolean" }, data: { type: "array", items: ref("Expense") } },
          }),
        },
      },
    }),
    post: op("Add expense", {
      tags: ["Expenses"],
      auth: true,
      operationId: "addExpense",
      parameters: [pathParam("id", "Trip ID")],
      requestBody: body("CreateExpenseRequest"),
    }),
  })
  addBoth("/itineraries/{id}/expenses/{expenseId}", {
    put: op("Update expense", {
      tags: ["Expenses"],
      auth: true,
      operationId: "updateExpense",
      parameters: [pathParam("id", "Trip ID"), pathParam("expenseId", "Expense ID")],
      requestBody: body("CreateExpenseRequest"),
    }),
    delete: op("Delete expense", {
      tags: ["Expenses"],
      auth: true,
      operationId: "deleteExpense",
      parameters: [pathParam("id", "Trip ID"), pathParam("expenseId", "Expense ID")],
    }),
  })
  addBoth("/itineraries/{id}/expenses/{expenseId}/duplicate", {
    post: op("Duplicate expense", {
      tags: ["Expenses"],
      auth: true,
      operationId: "duplicateExpense",
      parameters: [pathParam("id"), pathParam("expenseId")],
    }),
  })
  addBoth("/itineraries/{id}/expenses/export/csv", {
    get: op("Export expenses CSV", { tags: ["Expenses"], auth: true, operationId: "exportExpensesCsv", parameters: [pathParam("id")] }),
  })
  addBoth("/itineraries/{id}/expenses/export/pdf", {
    get: op("Export expenses PDF", { tags: ["Expenses"], auth: true, operationId: "exportExpensesPdf", parameters: [pathParam("id")] }),
  })

  // —— Bookings ——
  addBoth("/bookings", {
    get: op("List bookings", { tags: ["Bookings"], auth: true, operationId: "listBookings" }),
    post: op("Create booking", {
      tags: ["Bookings"],
      auth: true,
      operationId: "createBooking",
      requestBody: body("CreateBookingRequest"),
      responses: {
        201: { description: "Created", content: json({ type: "object", properties: { success: { type: "boolean" }, data: ref("Booking") } }) },
      },
    }),
  })
  addBoth("/bookings/dashboard", {
    get: op("Bookings dashboard", { tags: ["Bookings"], auth: true, operationId: "bookingsDashboard" }),
  })
  addBoth("/bookings/upcoming", {
    get: op("Upcoming bookings", { tags: ["Bookings"], auth: true, operationId: "upcomingBookings" }),
  })
  addBoth("/bookings/search", {
    get: op("Search bookings", {
      tags: ["Bookings"],
      auth: true,
      operationId: "searchBookings",
      parameters: [query("q", "Search query")],
    }),
  })
  addBoth("/bookings/{id}", {
    get: op("Get booking", { tags: ["Bookings"], auth: true, operationId: "getBooking", parameters: [pathParam("id")] }),
    put: op("Update booking", {
      tags: ["Bookings"],
      auth: true,
      operationId: "updateBooking",
      parameters: [pathParam("id")],
      requestBody: body("CreateBookingRequest"),
    }),
    delete: op("Delete booking", { tags: ["Bookings"], auth: true, operationId: "deleteBooking", parameters: [pathParam("id")] }),
  })
  addBoth("/bookings/{id}/convert-expense", {
    post: op("Convert booking to expense", {
      tags: ["Bookings", "Expenses"],
      auth: true,
      operationId: "convertBookingToExpense",
      parameters: [pathParam("id")],
    }),
  })
  addBoth("/trips/{id}/bookings", {
    get: op("Trip bookings", { tags: ["Bookings", "Trips"], auth: true, operationId: "tripBookings", parameters: [pathParam("id")] }),
  })
  addBoth("/trips/{id}/bookings/timeline", {
    get: op("Trip booking timeline", { tags: ["Bookings"], auth: true, operationId: "tripBookingTimeline", parameters: [pathParam("id")] }),
  })

  // —— Documents ——
  addBoth("/documents", {
    get: op("List documents", { tags: ["Documents"], auth: true, operationId: "listDocuments" }),
    post: op("Upload document", {
      tags: ["Documents"],
      auth: true,
      operationId: "uploadDocument",
      description: "multipart/form-data with file + metadata. Never returns file bytes in list responses.",
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                file: { type: "string", format: "binary" },
                title: { type: "string" },
                documentType: { type: "string" },
                tripId: { type: "string" },
                country: { type: "string" },
              },
            },
          },
        },
      },
    }),
  })
  addBoth("/documents/{id}", {
    get: op("Get document metadata", { tags: ["Documents"], auth: true, operationId: "getDocument", parameters: [pathParam("id")] }),
    put: op("Update document", { tags: ["Documents"], auth: true, operationId: "updateDocument", parameters: [pathParam("id")] }),
    delete: op("Delete document", { tags: ["Documents"], auth: true, operationId: "deleteDocument", parameters: [pathParam("id")] }),
  })
  addBoth("/documents/{id}/download", {
    get: op("Download document", { tags: ["Documents"], auth: true, operationId: "downloadDocument", parameters: [pathParam("id")] }),
  })
  addBoth("/documents/search", {
    get: op("Search documents", { tags: ["Documents"], auth: true, operationId: "searchDocuments", parameters: [query("q", "Query")] }),
  })
  addBoth("/documents/stats", {
    get: op("Document stats", { tags: ["Documents"], auth: true, operationId: "documentStats" }),
  })

  // —— Notifications ——
  addBoth("/notifications", {
    get: op("List notifications", {
      tags: ["Notifications"],
      auth: true,
      operationId: "listNotifications",
      responses: {
        200: {
          description: "Notifications",
          content: json({
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: { type: "array", items: ref("Notification") },
              unreadCount: { type: "integer" },
            },
          }),
        },
      },
    }),
  })
  addBoth("/notifications/unread-count", {
    get: op("Unread notification count", { tags: ["Notifications"], auth: true, operationId: "unreadCount" }),
  })
  addBoth("/notifications/read-all", {
    post: op("Mark all read", { tags: ["Notifications"], auth: true, operationId: "markAllRead" }),
  })
  addBoth("/notifications/read/{id}", {
    post: op("Mark one read", { tags: ["Notifications"], auth: true, operationId: "markOneRead", parameters: [pathParam("id")] }),
  })
  addBoth("/notifications/{id}", {
    delete: op("Delete notification", { tags: ["Notifications"], auth: true, operationId: "deleteNotification", parameters: [pathParam("id")] }),
  })
  addBoth("/notifications/settings", {
    get: op("Notification settings", { tags: ["Notifications"], auth: true, operationId: "getNotificationSettings" }),
    put: op("Update notification settings", { tags: ["Notifications"], auth: true, operationId: "updateNotificationSettings" }),
  })

  // —— Weather ——
  addBoth("/weather", {
    get: op("Current / day weather", {
      tags: ["Weather"],
      security: [],
      operationId: "getWeather",
      description: "Cached ~10 minutes. Public rate limit 60/min.",
      parameters: [
        query("destination", "Place name", { type: "string" }, true),
        query("date", "YYYY-MM-DD", { type: "string", format: "date" }),
      ],
      responses: {
        200: { description: "Weather", content: json({ type: "object", properties: { success: { type: "boolean" }, data: ref("Weather") } }) },
      },
    }),
  })
  addBoth("/weather/forecast", {
    get: op("Weather forecast", {
      tags: ["Weather"],
      security: [],
      operationId: "getForecast",
      parameters: [
        query("destination", "Place name", { type: "string" }, true),
        query("days", "Number of days", { type: "integer", default: 5 }),
      ],
    }),
  })
  addBoth("/weather/places/{tripId}", {
    get: op("Per-place weather for trip", {
      tags: ["Weather"],
      security: [],
      operationId: "getPlaceWeather",
      parameters: [pathParam("tripId")],
    }),
  })

  // —— Recommendations / Maps ——
  addBoth("/recommendations", {
    get: op("Recommendations", { tags: ["Recommendations"], security: [], operationId: "getRecommendations" }),
  })
  addBoth("/recommendations/nearby", {
    get: op("Nearby places (maps)", {
      tags: ["Maps", "Recommendations"],
      security: [],
      operationId: "nearbyPlaces",
      description: "Hotels, restaurants, attractions, hospitals, cafes near coordinates or destination.",
      parameters: [
        query("latitude", "Latitude", { type: "number" }),
        query("longitude", "Longitude", { type: "number" }),
        query("destination", "Destination name"),
        query("type", "Category", { type: "string", enum: ["restaurant", "cafe", "attraction", "hospital", "atm"] }),
      ],
    }),
    post: op("Nearby places (POST body)", {
      tags: ["Maps", "Recommendations"],
      security: [],
      operationId: "nearbyPlacesPost",
    }),
  })
  addBoth("/recommendations/nearby/categories", {
    get: op("Nearby categories", { tags: ["Maps"], security: [], operationId: "nearbyCategories" }),
  })

  // —— Analytics ——
  addBoth("/analytics/dashboard", {
    get: op("Analytics dashboard", {
      tags: ["Analytics"],
      auth: true,
      operationId: "analyticsDashboard",
      responses: {
        200: { description: "Dashboard", content: json({ type: "object", properties: { success: { type: "boolean" }, data: ref("Analytics") } }) },
      },
    }),
  })
  addBoth("/analytics/travel-score", {
    get: op("Travel score", { tags: ["Analytics"], auth: true, operationId: "travelScore" }),
  })
  addBoth("/analytics/recalculate", {
    post: op("Recalculate analytics", { tags: ["Analytics"], auth: true, operationId: "recalculateAnalytics" }),
  })
  addBoth("/analytics/export/csv", {
    get: op("Export analytics CSV", { tags: ["Analytics"], auth: true, operationId: "exportAnalyticsCsv" }),
  })
  addBoth("/analytics/export/pdf", {
    get: op("Export analytics PDF", { tags: ["Analytics"], auth: true, operationId: "exportAnalyticsPdf" }),
  })

  // —— AI ——
  const aiPost = (path, name, operationId) => {
    addBoth(`/ai${path}`, {
      post: op(name, {
        tags: ["AI"],
        auth: true,
        operationId,
        description: "Rate limit: 20 requests/hour. Responses may be cached 24h (prompt-hashed).",
        requestBody: body({ type: "object", additionalProperties: true }),
        responses: {
          200: { description: "AI result", content: json(ref("AIResponse")) },
          429: { description: "Rate limited", content: json(ref("ErrorResponse")) },
        },
      }),
    })
  }
  aiPost("/itinerary", "Generate personalized itinerary", "aiGenerateItinerary")
  aiPost("/enrich-descriptions", "Enrich itinerary descriptions", "aiEnrichDescriptions")
  aiPost("/suggest-day", "Suggest day activities", "aiSuggestDay")
  aiPost("/suggest-highlights", "Suggest highlights", "aiSuggestHighlights")
  aiPost("/trip-summary", "AI trip summary", "aiTripSummary")
  aiPost("/booking-query", "AI booking Q&A", "aiBookingQuery")
  aiPost("/document-query", "AI document Q&A", "aiDocumentQuery")
  aiPost("/risk-query", "AI risk Q&A", "aiRiskQuery")
  aiPost("/flight-query", "AI flight Q&A", "aiFlightQuery")
  aiPost("/budget-query", "AI budget Q&A", "aiBudgetQuery")

  // —— Copilot ——
  addBoth("/chat", {
    post: op("Copilot chat", { tags: ["Copilot", "AI"], auth: true, operationId: "copilotChat" }),
  })
  addBoth("/chat/stream", {
    post: op("Copilot chat (stream)", { tags: ["Copilot", "AI"], auth: true, operationId: "copilotChatStream" }),
  })
  addBoth("/chat/sessions", {
    get: op("List chat sessions", { tags: ["Copilot"], auth: true, operationId: "listChatSessions" }),
    post: op("Create chat session", { tags: ["Copilot"], auth: true, operationId: "createChatSession" }),
  })

  // —— Flights ——
  addBoth("/flights/status/{flightNumber}", {
    get: op("Live flight status", {
      tags: ["Flight Tracking"],
      auth: true,
      operationId: "flightStatus",
      parameters: [pathParam("flightNumber", "IATA flight number", "AI101")],
    }),
  })
  addBoth("/flights/track", {
    post: op("Start tracking flight", { tags: ["Flight Tracking"], auth: true, operationId: "trackFlight" }),
  })
  addBoth("/flights/track/{id}", {
    delete: op("Stop tracking", { tags: ["Flight Tracking"], auth: true, operationId: "stopTrack", parameters: [pathParam("id")] }),
  })
  addBoth("/flights/trip/{tripId}", {
    get: op("Flights for trip", { tags: ["Flight Tracking"], auth: true, operationId: "tripFlights", parameters: [pathParam("tripId")] }),
  })
  addBoth("/flights/history", {
    get: op("Flight tracking history", { tags: ["Flight Tracking"], auth: true, operationId: "flightHistory" }),
  })

  // —— Calendar ——
  addBoth("/calendar/status", {
    get: op("Calendar connection status", { tags: ["Calendar"], auth: true, operationId: "calendarStatus" }),
  })
  addBoth("/calendar/sync", {
    post: op("Sync trip to calendar", { tags: ["Calendar"], auth: true, operationId: "calendarSync" }),
  })
  addBoth("/calendar/google/connect", {
    post: op("Connect Google Calendar", { tags: ["Calendar"], auth: true, operationId: "googleConnect" }),
  })
  addBoth("/calendar/outlook/connect", {
    post: op("Connect Outlook Calendar", { tags: ["Calendar"], auth: true, operationId: "outlookConnect" }),
  })

  // —— Packing / Risk / Budget ——
  addBoth("/packing/generate", {
    post: op("Generate packing list", { tags: ["Packing", "AI"], auth: true, operationId: "generatePacking" }),
  })
  addBoth("/packing/{tripId}", {
    get: op("Get packing list", { tags: ["Packing"], auth: true, operationId: "getPacking", parameters: [pathParam("tripId")] }),
  })
  addBoth("/risk/analyze", {
    post: op("Analyze trip risks", { tags: ["Risk", "AI"], auth: true, operationId: "analyzeRisk" }),
  })
  addBoth("/risk/{tripId}", {
    get: op("Get trip risks", { tags: ["Risk"], auth: true, operationId: "getRisks", parameters: [pathParam("tripId")] }),
  })
  addBoth("/budget/analyze", {
    post: op("Analyze budget", { tags: ["Budget", "AI"], auth: true, operationId: "analyzeBudget" }),
  })
  addBoth("/budget/{tripId}", {
    get: op("Budget optimizer state", { tags: ["Budget"], auth: true, operationId: "getBudget", parameters: [pathParam("tripId")] }),
  })

  // —— Availability ——
  for (const resource of ["hotels", "flights", "trains", "buses", "activities"]) {
    addBoth(`/${resource}`, {
      get: op(`Search ${resource}`, {
        tags: ["Availability"],
        security: [],
        operationId: `search${resource[0].toUpperCase()}${resource.slice(1)}`,
        parameters: [
          query("destination", "Destination"),
          query("date", "Date YYYY-MM-DD"),
        ],
      }),
    })
  }

  // —— Blogs ——
  addBoth("/blogs", {
    get: op("List blogs", { tags: ["Blogs"], security: [], operationId: "listBlogs" }),
  })
  addBoth("/blogs/{slug}", {
    get: op("Get blog by slug", {
      tags: ["Blogs"],
      security: [],
      operationId: "getBlog",
      parameters: [pathParam("slug", "Blog slug", "ten-day-kerala")],
    }),
  })

  // —— Monitoring (admin) ——
  addBoth("/monitoring/overview", {
    get: op("Admin monitoring overview", {
      tags: ["Monitoring"],
      auth: true,
      operationId: "monitoringOverview",
      description: "Requires admin role. Includes Redis, Mongo, sockets, cache hit ratio.",
    }),
  })
  addBoth("/monitoring/metrics", {
    get: op("Admin metrics", { tags: ["Monitoring"], auth: true, operationId: "monitoringMetrics" }),
  })
  addBoth("/monitoring/alerts", {
    get: op("Admin alerts", { tags: ["Monitoring"], auth: true, operationId: "monitoringAlerts" }),
  })
  addBoth("/monitoring/services", {
    get: op("Admin service health", { tags: ["Monitoring"], auth: true, operationId: "monitoringServices" }),
  })

  function addBoth(rel, methods) {
    p[`/api/v1${rel}`] = methods
    p[`/api${rel}`] = legacyMirror(methods)
  }

  function mirror(v1Base, legacyBase, methods) {
    p[v1Base] = methods
    p[legacyBase] = legacyMirror(methods)
  }

  return p
}

function legacyMirror(methods) {
  const out = {}
  for (const [method, def] of Object.entries(methods)) {
    out[method] = {
      ...def,
      description: `${def.description || def.summary}\n\n**Legacy alias** of the \`/api/v1\` path. Prefer versioned URLs.`,
      "x-deprecated-prefer": "Use /api/v1" + (def.operationId || ""),
    }
  }
  return out
}

export default buildOpenApiDocument
