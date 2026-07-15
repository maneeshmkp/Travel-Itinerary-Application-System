/** Canonical domain event names. */
export const DOMAIN_EVENTS = Object.freeze({
  USER_REGISTERED: "UserRegistered",
  USER_LOGGED_IN: "UserLoggedIn",
  TRIP_CREATED: "TripCreated",
  TRIP_UPDATED: "TripUpdated",
  TRIP_DELETED: "TripDeleted",
  BOOKING_CREATED: "BookingCreated",
  BOOKING_CANCELLED: "BookingCancelled",
  EXPENSE_ADDED: "ExpenseAdded",
  EXPENSE_UPDATED: "ExpenseUpdated",
  EXPENSE_DELETED: "ExpenseDeleted",
  DOCUMENT_UPLOADED: "DocumentUploaded",
  DOCUMENT_DELETED: "DocumentDeleted",
  NOTIFICATION_CREATED: "NotificationCreated",
  WEATHER_UPDATED: "WeatherUpdated",
  FLIGHT_STATUS_CHANGED: "FlightStatusChanged",
  AI_ITINERARY_GENERATED: "AIItineraryGenerated",
  BUDGET_EXCEEDED: "BudgetExceeded",
  ROLE_CHANGED: "RoleChanged",
})

export default DOMAIN_EVENTS
