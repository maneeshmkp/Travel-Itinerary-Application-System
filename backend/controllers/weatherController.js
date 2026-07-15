import { getWeatherForDate, getWeatherForecast } from "../services/weatherService.js"
import { getPlaceWeatherForTrip } from "../services/placeWeatherService.js"

// @desc    Weather for a destination on a specific date
// @route   GET /api/weather?destination=&date=
// @access  Public
export const getWeather = async (req, res, next) => {
  try {
    const { destination, date } = req.query
    let activities = []

    if (req.query.activities) {
      try {
        activities = JSON.parse(req.query.activities)
        if (!Array.isArray(activities)) activities = []
      } catch {
        activities = []
      }
    }

    const data = await getWeatherForDate(destination, date, activities)
    res.status(200).json({ success: true, data })
    const { publishAsync, DOMAIN_EVENTS } = await import("../events/index.js")
    publishAsync(
      DOMAIN_EVENTS.WEATHER_UPDATED,
      {
        userId: req.user?._id ? String(req.user._id) : null,
        location: destination,
        date,
        summary: data?.condition || data?.summary,
      },
      { source: "weatherController.getWeather" },
    )
  } catch (error) {
    next(error)
  }
}

// @desc    Multi-day forecast for trip planning
// @route   GET /api/weather/forecast?destination=&days=&startDate=
// @access  Public
export const getForecast = async (req, res, next) => {
  try {
    const { destination, days, startDate } = req.query
    const data = await getWeatherForecast(destination, days, startDate)
    res.status(200).json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

// @desc    Place-wise weather for all geocoded activity stops on a trip
// @route   GET /api/weather/places/:tripId
// @access  Public
export const getPlaceWeather = async (req, res, next) => {
  try {
    const data = await getPlaceWeatherForTrip(req.params.tripId, req.query.startDate)
    res.status(200).json({
      success: true,
      tripId: data.tripId,
      places: data.places,
      destination: data.destination,
      startDate: data.startDate,
      demo: data.demo,
    })
  } catch (error) {
    next(error)
  }
}
