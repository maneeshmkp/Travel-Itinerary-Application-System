import dotenv from "dotenv"
import connectDB from "../config/db.js"
import User from "../models/User.js"
import Itinerary from "../models/Itinerary.js"
import Booking from "../models/Booking.js"

dotenv.config()

async function seed() {
  await connectDB()

  const user = await User.findOne().sort({ createdAt: 1 })
  if (!user) {
    console.error("No users found — sign up first or run npm run seed")
    process.exit(1)
  }

  const trip = await Itinerary.findOne({ ownerId: user._id }).sort({ createdAt: -1 })
  if (!trip) {
    console.error("No itineraries found for user")
    process.exit(1)
  }

  const now = new Date()
  const day = (offset) => {
    const d = new Date(now)
    d.setDate(d.getDate() + offset)
    return d
  }

  const samples = [
    {
      bookingType: "flight",
      provider: "Air India",
      bookingReference: "AI302",
      confirmationNumber: "CONF-FL-8821",
      status: "confirmed",
      departureDate: day(5),
      arrivalDate: day(5),
      price: 18500,
      currency: "INR",
      paymentStatus: "paid",
      travelerNames: [user.name || "Traveler"],
      seatNumber: "12A",
      gate: "B7",
      terminal: "3",
      locationName: "DEL Airport",
    },
    {
      bookingType: "hotel",
      provider: "Taj View Agra",
      bookingReference: "TAJ-44102",
      confirmationNumber: "HTL-99231",
      status: "confirmed",
      checkIn: day(5),
      checkOut: day(8),
      price: 12000,
      currency: "INR",
      paymentStatus: "paid",
      hotelAddress: "Fatehabad Road, Agra",
      phone: "+91 562 223 1234",
      latitude: 27.1687,
      longitude: 78.0421,
      locationName: "Taj View Agra",
    },
    {
      bookingType: "train",
      provider: "IRCTC",
      bookingReference: "PNR-4829103847",
      status: "confirmed",
      departureDate: day(6),
      arrivalDate: day(6),
      price: 850,
      currency: "INR",
      paymentStatus: "paid",
      travelerNames: [user.name || "Traveler"],
    },
    {
      bookingType: "restaurant",
      provider: "Pinch of Spice",
      bookingReference: "RES-2201",
      status: "confirmed",
      eventDate: day(6),
      price: 0,
      currency: "INR",
      paymentStatus: "pending",
      phone: "+91 562 402 6666",
      locationName: "Pinch of Spice, Agra",
      latitude: 27.1631,
      longitude: 78.0542,
    },
    {
      bookingType: "taxi",
      provider: "Uber",
      bookingReference: "UB-77219",
      status: "upcoming",
      departureDate: day(5),
      price: 450,
      currency: "INR",
      paymentStatus: "pending",
    },
    {
      bookingType: "insurance",
      provider: "ICICI Lombard",
      confirmationNumber: "INS-2026-AGRA",
      status: "confirmed",
      eventDate: day(4),
      price: 1200,
      currency: "INR",
      paymentStatus: "paid",
    },
  ]

  await Booking.deleteMany({ userId: user._id, tripId: trip._id, bookingReference: { $in: samples.map((s) => s.bookingReference) } })

  for (const s of samples) {
    await Booking.create({ userId: user._id, tripId: trip._id, ...s })
  }

  console.log(`Seeded ${samples.length} bookings for trip "${trip.title}" (${trip._id})`)
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
