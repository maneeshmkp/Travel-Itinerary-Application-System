/**
 * Flight status provider interface.
 * Implementations: mock, aviationstack
 */

export function getConfiguredProviderName() {
  if (process.env.AVIATIONSTACK_API_KEY?.trim()) return "aviationstack"
  if (process.env.FLIGHTAWARE_API_KEY?.trim()) return "flightaware"
  return "mock"
}
