import dotenv from "dotenv"
import connectDB from "../config/db.js"
import Itinerary from "../models/Itinerary.js"
import Day from "../models/Day.js"
import Activity from "../models/Activity.js"

dotenv.config()

const seedData = async () => {
  try {
    await connectDB()

    // Clear existing data
    console.log("Clearing existing data...")
    await Activity.deleteMany({})
    await Day.deleteMany({})
    await Itinerary.deleteMany({})

    console.log("Creating seed data...")

    // Phuket Itineraries
    const phuketItineraries = [
      {
        title: "Phuket Beach Paradise - 3 Days",
        destination: "Phuket, Thailand",
        numberOfNights: 3,
        description:
          "Perfect introduction to Phuket's stunning beaches, vibrant nightlife, and delicious Thai cuisine. Ideal for first-time visitors looking for a mix of relaxation and adventure.",
        budget: { min: 800, max: 1200, currency: "USD" },
        bestTimeToVisit: "November - March",
        highlights: [
          "Sunset at Promthep Cape",
          "Island hopping to Phi Phi Islands",
          "Traditional Thai massage at the beach",
          "Fresh seafood at Patong Beach",
          "Cultural visit to Big Buddha",
        ],
        tags: ["beach", "cultural", "family", "budget"],
        isRecommended: true,
        days: [
          {
            dayNumber: 1,
            hotel: {
              name: "Patong Beach Resort",
              location: "Patong Beach, Phuket",
              rating: 4,
              checkIn: "3:00 PM",
              checkOut: "12:00 PM",
            },
            activities: [
              {
                name: "Airport Transfer & Hotel Check-in",
                description:
                  "Comfortable transfer from Phuket International Airport to your beachfront resort. Get settled and enjoy welcome drinks.",
                time: "2:00 PM",
                location: "Patong Beach Resort",
                category: "relaxation",
                duration: "2 hours",
              },
              {
                name: "Patong Beach Exploration",
                description:
                  "Take your first steps on the famous Patong Beach. Enjoy swimming, sunbathing, and beachside refreshments.",
                time: "4:00 PM",
                location: "Patong Beach",
                category: "relaxation",
                duration: "3 hours",
              },
              {
                name: "Bangla Road Night Market",
                description:
                  "Experience Phuket's vibrant nightlife and street food scene. Try local delicacies and shop for souvenirs.",
                time: "7:00 PM",
                location: "Bangla Road, Patong",
                category: "cultural",
                duration: "3 hours",
              },
            ],
          },
          {
            dayNumber: 2,
            hotel: {
              name: "Patong Beach Resort",
              location: "Patong Beach, Phuket",
              rating: 4,
            },
            activities: [
              {
                name: "Phi Phi Islands Day Trip",
                description:
                  "Full-day speedboat tour to the famous Phi Phi Islands. Visit Maya Bay, snorkel in crystal-clear waters, and enjoy a beachside lunch.",
                time: "8:00 AM",
                location: "Phi Phi Islands",
                category: "adventure",
                duration: "8 hours",
              },
              {
                name: "Traditional Thai Dinner",
                description:
                  "Authentic Thai cuisine at a local restaurant with cultural performances and traditional music.",
                time: "7:00 PM",
                location: "Old Phuket Town",
                category: "dining",
                duration: "2 hours",
              },
            ],
          },
          {
            dayNumber: 3,
            hotel: {
              name: "Patong Beach Resort",
              location: "Patong Beach, Phuket",
              rating: 4,
            },
            activities: [
              {
                name: "Big Buddha Temple Visit",
                description:
                  "Visit the iconic 45-meter tall Big Buddha statue and enjoy panoramic views of Phuket. Learn about Buddhist culture and traditions.",
                time: "9:00 AM",
                location: "Big Buddha Temple, Chalong",
                category: "cultural",
                duration: "2 hours",
              },
              {
                name: "Promthep Cape Sunset",
                description:
                  "Watch the spectacular sunset from Phuket's most famous viewpoint. Perfect photo opportunities and romantic atmosphere.",
                time: "5:30 PM",
                location: "Promthep Cape",
                category: "sightseeing",
                duration: "2 hours",
              },
              {
                name: "Farewell Beach Dinner",
                description:
                  "Final dinner on the beach with fresh seafood and tropical cocktails as you reflect on your Phuket adventure.",
                time: "7:30 PM",
                location: "Kata Beach",
                category: "dining",
                duration: "2 hours",
              },
            ],
          },
          {
            dayNumber: 4,
            hotel: {
              name: "Patong Beach Resort",
              location: "Patong Beach, Phuket",
              rating: 4,
            },
            activities: [
              {
                name: "Departure Transfer",
                description: "Check out and transfer to Phuket International Airport for your departure flight.",
                time: "10:00 AM",
                location: "Phuket International Airport",
                category: "relaxation",
                duration: "2 hours",
              },
            ],
          },
        ],
      },
      {
        title: "Luxury Phuket Escape - 5 Days",
        destination: "Phuket, Thailand",
        numberOfNights: 5,
        description:
          "Indulge in the ultimate luxury experience with premium resorts, private tours, spa treatments, and exclusive dining. Perfect for couples and luxury travelers.",
        budget: { min: 2500, max: 4000, currency: "USD" },
        bestTimeToVisit: "November - April",
        highlights: [
          "Private yacht charter to secluded islands",
          "Michelin-starred dining experiences",
          "Luxury spa treatments with ocean views",
          "Private beach access and butler service",
          "Helicopter tour over Phang Nga Bay",
        ],
        tags: ["luxury", "romantic", "beach", "adventure"],
        isRecommended: true,
        days: [
          {
            dayNumber: 1,
            hotel: {
              name: "The Nai Harn Phuket",
              location: "Nai Harn Beach, Phuket",
              rating: 5,
              checkIn: "3:00 PM",
              checkOut: "12:00 PM",
            },
            activities: [
              {
                name: "VIP Airport Transfer",
                description:
                  "Luxury limousine transfer with champagne service from airport to your 5-star resort overlooking Nai Harn Beach.",
                time: "2:00 PM",
                location: "The Nai Harn Phuket",
                category: "relaxation",
                duration: "1.5 hours",
              },
              {
                name: "Sunset Cocktails at Rock Bar",
                description:
                  "Exclusive cocktails at the resort's cliff-top bar with panoramic ocean views and gourmet canapés.",
                time: "6:00 PM",
                location: "The Nai Harn Resort",
                category: "dining",
                duration: "2 hours",
              },
            ],
          },
          {
            dayNumber: 2,
            hotel: {
              name: "The Nai Harn Phuket",
              location: "Nai Harn Beach, Phuket",
              rating: 5,
            },
            activities: [
              {
                name: "Private Yacht Charter",
                description:
                  "Full-day private yacht charter to Phi Phi Islands with personal chef, snorkeling equipment, and premium beverages.",
                time: "9:00 AM",
                location: "Phi Phi Islands",
                category: "adventure",
                duration: "8 hours",
              },
              {
                name: "Beachside Fine Dining",
                description:
                  "Private dinner on the beach with personal chef preparing fresh seafood and Thai delicacies under the stars.",
                time: "7:30 PM",
                location: "Nai Harn Beach",
                category: "dining",
                duration: "2.5 hours",
              },
            ],
          },
          {
            dayNumber: 3,
            hotel: {
              name: "The Nai Harn Phuket",
              location: "Nai Harn Beach, Phuket",
              rating: 5,
            },
            activities: [
              {
                name: "Luxury Spa Experience",
                description:
                  "Full-day spa package including traditional Thai massage, aromatherapy, and wellness treatments in oceanview pavilions.",
                time: "10:00 AM",
                location: "The Nai Harn Spa",
                category: "relaxation",
                duration: "6 hours",
              },
              {
                name: "Michelin Star Dining",
                description:
                  "Exclusive dinner at PRU restaurant, featuring innovative Thai cuisine with locally sourced ingredients.",
                time: "7:00 PM",
                location: "PRU Restaurant, Trisara",
                category: "dining",
                duration: "3 hours",
              },
            ],
          },
          {
            dayNumber: 4,
            hotel: {
              name: "The Nai Harn Phuket",
              location: "Nai Harn Beach, Phuket",
              rating: 5,
            },
            activities: [
              {
                name: "Helicopter Tour",
                description:
                  "Private helicopter tour over Phang Nga Bay, James Bond Island, and Phuket's coastline with champagne service.",
                time: "10:00 AM",
                location: "Phang Nga Bay",
                category: "adventure",
                duration: "3 hours",
              },
              {
                name: "Private Cooking Class",
                description:
                  "Learn to prepare authentic Thai dishes with a renowned chef in a private kitchen setting with market tour.",
                time: "3:00 PM",
                location: "The Nai Harn Resort",
                category: "cultural",
                duration: "4 hours",
              },
            ],
          },
          {
            dayNumber: 5,
            hotel: {
              name: "The Nai Harn Phuket",
              location: "Nai Harn Beach, Phuket",
              rating: 5,
            },
            activities: [
              {
                name: "Private Island Picnic",
                description:
                  "Exclusive day trip to a private island with gourmet picnic, water sports, and personal butler service.",
                time: "9:00 AM",
                location: "Private Island near Phuket",
                category: "adventure",
                duration: "7 hours",
              },
              {
                name: "Farewell Sunset Cruise",
                description:
                  "Romantic sunset cruise on a luxury catamaran with premium wines and gourmet dinner as your final Phuket experience.",
                time: "5:00 PM",
                location: "Andaman Sea",
                category: "romantic",
                duration: "4 hours",
              },
            ],
          },
          {
            dayNumber: 6,
            hotel: {
              name: "The Nai Harn Phuket",
              location: "Nai Harn Beach, Phuket",
              rating: 5,
            },
            activities: [
              {
                name: "VIP Departure",
                description: "Luxury transfer to airport with express check-in service and lounge access.",
                time: "11:00 AM",
                location: "Phuket International Airport",
                category: "relaxation",
                duration: "2 hours",
              },
            ],
          },
        ],
      },
      {
        title: "Phuket Adventure Week - 7 Days",
        destination: "Phuket, Thailand",
        numberOfNights: 7,
        description:
          "Action-packed adventure combining water sports, jungle trekking, cultural experiences, and island exploration. Perfect for thrill-seekers and active travelers.",
        budget: { min: 1500, max: 2200, currency: "USD" },
        bestTimeToVisit: "November - March",
        highlights: [
          "Scuba diving certification course",
          "ATV jungle adventure through rainforest",
          "Rock climbing at Railay Beach",
          "White water rafting expedition",
          "Night fishing with local fishermen",
        ],
        tags: ["adventure", "solo", "cultural", "beach"],
        isRecommended: true,
        days: [
          {
            dayNumber: 1,
            hotel: {
              name: "Kata Beach Adventure Resort",
              location: "Kata Beach, Phuket",
              rating: 4,
              checkIn: "3:00 PM",
              checkOut: "12:00 PM",
            },
            activities: [
              {
                name: "Arrival & Equipment Briefing",
                description:
                  "Check-in and meet your adventure guide. Equipment fitting and safety briefing for the week's activities.",
                time: "3:00 PM",
                location: "Kata Beach Adventure Resort",
                category: "adventure",
                duration: "2 hours",
              },
              {
                name: "Sunset Kayaking",
                description:
                  "Gentle introduction with sea kayaking around Kata Bay as the sun sets, perfect for getting acclimatized.",
                time: "5:30 PM",
                location: "Kata Bay",
                category: "adventure",
                duration: "2.5 hours",
              },
            ],
          },
          {
            dayNumber: 2,
            hotel: {
              name: "Kata Beach Adventure Resort",
              location: "Kata Beach, Phuket",
              rating: 4,
            },
            activities: [
              {
                name: "Scuba Diving Course - Day 1",
                description:
                  "Begin your PADI Open Water certification with pool training and theory sessions. Learn essential diving skills.",
                time: "8:00 AM",
                location: "Kata Diving Center",
                category: "adventure",
                duration: "6 hours",
              },
              {
                name: "Thai Boxing Class",
                description:
                  "Learn the basics of Muay Thai from experienced trainers in an authentic training camp setting.",
                time: "4:00 PM",
                location: "Phuket Muay Thai Camp",
                category: "cultural",
                duration: "2 hours",
              },
            ],
          },
          {
            dayNumber: 3,
            hotel: {
              name: "Kata Beach Adventure Resort",
              location: "Kata Beach, Phuket",
              rating: 4,
            },
            activities: [
              {
                name: "ATV Jungle Adventure",
                description:
                  "Full-day ATV expedition through Phuket's tropical rainforest, visiting hidden waterfalls and local villages.",
                time: "9:00 AM",
                location: "Phuket Jungle",
                category: "adventure",
                duration: "7 hours",
              },
              {
                name: "Night Market Food Tour",
                description:
                  "Guided street food tour through local night markets, trying authentic Thai dishes and learning about local culture.",
                time: "7:00 PM",
                location: "Phuket Weekend Market",
                category: "cultural",
                duration: "3 hours",
              },
            ],
          },
          {
            dayNumber: 4,
            hotel: {
              name: "Kata Beach Adventure Resort",
              location: "Kata Beach, Phuket",
              rating: 4,
            },
            activities: [
              {
                name: "Scuba Diving Course - Day 2",
                description:
                  "Complete your open water dives in the clear waters around Phuket. Explore coral reefs and marine life.",
                time: "8:00 AM",
                location: "Racha Islands",
                category: "adventure",
                duration: "8 hours",
              },
              {
                name: "Beach Volleyball Tournament",
                description:
                  "Join other travelers for a friendly beach volleyball tournament followed by barbecue dinner on the beach.",
                time: "6:00 PM",
                location: "Kata Beach",
                category: "adventure",
                duration: "3 hours",
              },
            ],
          },
          {
            dayNumber: 5,
            hotel: {
              name: "Kata Beach Adventure Resort",
              location: "Kata Beach, Phuket",
              rating: 4,
            },
            activities: [
              {
                name: "Rock Climbing at Railay",
                description:
                  "Day trip to Railay Beach for world-class limestone rock climbing with professional guides and equipment.",
                time: "7:00 AM",
                location: "Railay Beach, Krabi",
                category: "adventure",
                duration: "10 hours",
              },
            ],
          },
          {
            dayNumber: 6,
            hotel: {
              name: "Kata Beach Adventure Resort",
              location: "Kata Beach, Phuket",
              rating: 4,
            },
            activities: [
              {
                name: "White Water Rafting",
                description:
                  "Thrilling white water rafting adventure on the Phang Nga River with rapids ranging from Class II to IV.",
                time: "8:00 AM",
                location: "Phang Nga River",
                category: "adventure",
                duration: "6 hours",
              },
              {
                name: "Traditional Thai Massage",
                description: "Relax and recover with a traditional Thai massage after your rafting adventure.",
                time: "4:00 PM",
                location: "Kata Beach Spa",
                category: "relaxation",
                duration: "2 hours",
              },
              {
                name: "Night Fishing Experience",
                description:
                  "Join local fishermen for traditional night fishing, learning ancient techniques and enjoying fresh catch.",
                time: "7:00 PM",
                location: "Chalong Bay",
                category: "cultural",
                duration: "4 hours",
              },
            ],
          },
          {
            dayNumber: 7,
            hotel: {
              name: "Kata Beach Adventure Resort",
              location: "Kata Beach, Phuket",
              rating: 4,
            },
            activities: [
              {
                name: "Sunrise Hike to Viewpoint",
                description:
                  "Early morning hike to Kata Viewpoint for spectacular sunrise views over the three bays of Phuket.",
                time: "5:30 AM",
                location: "Kata Viewpoint",
                category: "adventure",
                duration: "3 hours",
              },
              {
                name: "Souvenir Shopping & Relaxation",
                description:
                  "Final day to shop for souvenirs, relax on the beach, and reflect on your adventure-filled week.",
                time: "10:00 AM",
                location: "Kata Beach & Local Markets",
                category: "shopping",
                duration: "4 hours",
              },
              {
                name: "Farewell Dinner",
                description:
                  "Celebration dinner with your adventure group, sharing stories and memories from the week.",
                time: "6:00 PM",
                location: "Kata Beach Restaurant",
                category: "dining",
                duration: "3 hours",
              },
            ],
          },
          {
            dayNumber: 8,
            hotel: {
              name: "Kata Beach Adventure Resort",
              location: "Kata Beach, Phuket",
              rating: 4,
            },
            activities: [
              {
                name: "Departure Transfer",
                description:
                  "Transfer to Phuket International Airport with all your adventure memories and new diving certification.",
                time: "10:00 AM",
                location: "Phuket International Airport",
                category: "relaxation",
                duration: "2 hours",
              },
            ],
          },
        ],
      },
    ]

    // Krabi Itineraries
    const krabiItineraries = [
      {
        title: "Krabi Island Hopping - 4 Days",
        destination: "Krabi, Thailand",
        numberOfNights: 4,
        description:
          "Discover the stunning limestone karsts and pristine beaches of Krabi through island hopping adventures, snorkeling, and beach relaxation.",
        budget: { min: 900, max: 1400, currency: "USD" },
        bestTimeToVisit: "November - March",
        highlights: [
          "Four Islands Tour by longtail boat",
          "Emerald Pool and Hot Springs visit",
          "Railay Beach rock climbing",
          "Sunset at Ao Nang Beach",
          "Traditional longtail boat experience",
        ],
        tags: ["beach", "adventure", "family", "budget"],
        isRecommended: true,
        days: [
          {
            dayNumber: 1,
            hotel: {
              name: "Ao Nang Beach Resort",
              location: "Ao Nang, Krabi",
              rating: 4,
              checkIn: "3:00 PM",
              checkOut: "12:00 PM",
            },
            activities: [
              {
                name: "Airport Transfer & Check-in",
                description:
                  "Transfer from Krabi Airport to your beachfront resort in Ao Nang. Welcome drinks and resort orientation.",
                time: "2:00 PM",
                location: "Ao Nang Beach Resort",
                category: "relaxation",
                duration: "2 hours",
              },
              {
                name: "Ao Nang Beach Walk",
                description:
                  "Explore the main beach of Ao Nang, enjoy swimming and get familiar with the local area and restaurants.",
                time: "4:30 PM",
                location: "Ao Nang Beach",
                category: "relaxation",
                duration: "2 hours",
              },
              {
                name: "Sunset Dinner",
                description:
                  "Beachfront dinner watching the spectacular Krabi sunset with fresh seafood and Thai specialties.",
                time: "6:30 PM",
                location: "Ao Nang Beachfront",
                category: "dining",
                duration: "2 hours",
              },
            ],
          },
          {
            dayNumber: 2,
            hotel: {
              name: "Ao Nang Beach Resort",
              location: "Ao Nang, Krabi",
              rating: 4,
            },
            activities: [
              {
                name: "Four Islands Tour",
                description:
                  "Full-day longtail boat tour visiting Phra Nang Cave Beach, Chicken Island, Tup Island, and Poda Island with snorkeling and lunch.",
                time: "8:30 AM",
                location: "Four Islands, Krabi",
                category: "adventure",
                duration: "8 hours",
              },
              {
                name: "Night Market Exploration",
                description: "Visit Ao Nang night market for local street food, souvenirs, and cultural experiences.",
                time: "7:00 PM",
                location: "Ao Nang Night Market",
                category: "cultural",
                duration: "2 hours",
              },
            ],
          },
          {
            dayNumber: 3,
            hotel: {
              name: "Ao Nang Beach Resort",
              location: "Ao Nang, Krabi",
              rating: 4,
            },
            activities: [
              {
                name: "Emerald Pool & Hot Springs",
                description:
                  "Visit the famous Emerald Pool for swimming in crystal-clear natural pools, followed by relaxing hot springs.",
                time: "9:00 AM",
                location: "Thung Teao Forest Natural Park",
                category: "relaxation",
                duration: "4 hours",
              },
              {
                name: "Tiger Cave Temple",
                description:
                  "Climb 1,237 steps to reach the summit of Tiger Cave Temple for panoramic views of Krabi province.",
                time: "2:00 PM",
                location: "Tiger Cave Temple",
                category: "cultural",
                duration: "3 hours",
              },
              {
                name: "Traditional Thai Massage",
                description: "Unwind with a traditional Thai massage after your temple climb and nature exploration.",
                time: "6:00 PM",
                location: "Ao Nang Spa",
                category: "relaxation",
                duration: "1.5 hours",
              },
            ],
          },
          {
            dayNumber: 4,
            hotel: {
              name: "Ao Nang Beach Resort",
              location: "Ao Nang, Krabi",
              rating: 4,
            },
            activities: [
              {
                name: "Railay Beach Adventure",
                description:
                  "Take a longtail boat to Railay Beach for rock climbing, cave exploration, and beach relaxation at one of Thailand's most beautiful beaches.",
                time: "9:00 AM",
                location: "Railay Beach",
                category: "adventure",
                duration: "6 hours",
              },
              {
                name: "Farewell Seafood Dinner",
                description:
                  "Final dinner featuring the best of Krabi's seafood with ocean views and traditional Thai entertainment.",
                time: "6:30 PM",
                location: "Ao Nang Beachfront Restaurant",
                category: "dining",
                duration: "2.5 hours",
              },
            ],
          },
          {
            dayNumber: 5,
            hotel: {
              name: "Ao Nang Beach Resort",
              location: "Ao Nang, Krabi",
              rating: 4,
            },
            activities: [
              {
                name: "Departure Transfer",
                description: "Check out and transfer to Krabi Airport for your departure flight.",
                time: "10:00 AM",
                location: "Krabi Airport",
                category: "relaxation",
                duration: "1.5 hours",
              },
            ],
          },
        ],
      },
      {
        title: "Romantic Krabi Honeymoon - 6 Days",
        destination: "Krabi, Thailand",
        numberOfNights: 6,
        description:
          "Perfect romantic getaway with private beach dinners, couples spa treatments, sunset cruises, and intimate experiences in Krabi's most beautiful locations.",
        budget: { min: 2000, max: 3200, currency: "USD" },
        bestTimeToVisit: "November - April",
        highlights: [
          "Private beach dinner under the stars",
          "Couples spa treatments with ocean views",
          "Sunset cruise to Hong Islands",
          "Private longtail boat tours",
          "Romantic cave dining experience",
        ],
        tags: ["romantic", "luxury", "beach", "cultural"],
        isRecommended: true,
        days: [
          {
            dayNumber: 1,
            hotel: {
              name: "Rayavadee Resort",
              location: "Railay Beach, Krabi",
              rating: 5,
              checkIn: "3:00 PM",
              checkOut: "12:00 PM",
            },
            activities: [
              {
                name: "VIP Transfer & Welcome",
                description:
                  "Private transfer from Krabi Airport to exclusive Rayavadee Resort with champagne welcome and flower petals.",
                time: "2:00 PM",
                location: "Rayavadee Resort, Railay",
                category: "relaxation",
                duration: "2 hours",
              },
              {
                name: "Couples Sunset Cocktails",
                description:
                  "Private cocktails on your villa terrace overlooking the limestone cliffs and Andaman Sea.",
                time: "6:00 PM",
                location: "Private Villa Terrace",
                category: "romantic",
                duration: "2 hours",
              },
            ],
          },
          {
            dayNumber: 2,
            hotel: {
              name: "Rayavadee Resort",
              location: "Railay Beach, Krabi",
              rating: 5,
            },
            activities: [
              {
                name: "Private Island Picnic",
                description:
                  "Exclusive day trip to a secluded island with private chef, gourmet picnic, and water activities just for two.",
                time: "9:00 AM",
                location: "Private Island near Krabi",
                category: "romantic",
                duration: "7 hours",
              },
              {
                name: "Beachside Candlelit Dinner",
                description:
                  "Romantic dinner on the beach with personal chef, candlelit table, and traditional Thai music.",
                time: "7:30 PM",
                location: "Railay Beach",
                category: "dining",
                duration: "3 hours",
              },
            ],
          },
          {
            dayNumber: 3,
            hotel: {
              name: "Rayavadee Resort",
              location: "Railay Beach, Krabi",
              rating: 5,
            },
            activities: [
              {
                name: "Couples Spa Day",
                description:
                  "Full-day spa experience with couples massage, aromatherapy, and wellness treatments in a private pavilion.",
                time: "10:00 AM",
                location: "Rayavadee Spa",
                category: "relaxation",
                duration: "5 hours",
              },
              {
                name: "Sunset Cruise to Hong Islands",
                description:
                  "Private longtail boat cruise to Hong Islands with champagne, canapés, and spectacular sunset views.",
                time: "4:00 PM",
                location: "Hong Islands",
                category: "romantic",
                duration: "4 hours",
              },
            ],
          },
          {
            dayNumber: 4,
            hotel: {
              name: "Rayavadee Resort",
              location: "Railay Beach, Krabi",
              rating: 5,
            },
            activities: [
              {
                name: "Private Cooking Class",
                description:
                  "Learn to prepare Thai cuisine together with a private chef in a romantic outdoor kitchen setting.",
                time: "10:00 AM",
                location: "Rayavadee Resort",
                category: "cultural",
                duration: "3 hours",
              },
              {
                name: "Cave Dining Experience",
                description: "Unique dinner experience in a limestone cave with gourmet cuisine and ambient lighting.",
                time: "6:00 PM",
                location: "Phra Nang Cave",
                category: "dining",
                duration: "3 hours",
              },
            ],
          },
          {
            dayNumber: 5,
            hotel: {
              name: "Rayavadee Resort",
              location: "Railay Beach, Krabi",
              rating: 5,
            },
            activities: [
              {
                name: "Private Beach Day",
                description:
                  "Exclusive access to a private section of beach with personal butler service, water sports, and gourmet lunch.",
                time: "9:00 AM",
                location: "Private Beach, Railay",
                category: "relaxation",
                duration: "6 hours",
              },
              {
                name: "Stargazing Experience",
                description:
                  "Romantic evening of stargazing with telescope, astronomy guide, and midnight champagne service.",
                time: "8:00 PM",
                location: "Resort Observatory Deck",
                category: "romantic",
                duration: "3 hours",
              },
            ],
          },
          {
            dayNumber: 6,
            hotel: {
              name: "Rayavadee Resort",
              location: "Railay Beach, Krabi",
              rating: 5,
            },
            activities: [
              {
                name: "Sunrise Yoga for Couples",
                description:
                  "Private yoga session on the beach at sunrise, followed by healthy breakfast and fresh fruit juices.",
                time: "6:00 AM",
                location: "Railay Beach",
                category: "relaxation",
                duration: "2.5 hours",
              },
              {
                name: "Couples Photography Session",
                description:
                  "Professional photography session capturing your romantic moments against Krabi's stunning backdrops.",
                time: "10:00 AM",
                location: "Various scenic locations",
                category: "romantic",
                duration: "3 hours",
              },
              {
                name: "Farewell Dinner Cruise",
                description:
                  "Final romantic dinner aboard a luxury yacht with live music and panoramic views of Krabi's coastline.",
                time: "5:00 PM",
                location: "Luxury Yacht, Andaman Sea",
                category: "dining",
                duration: "4 hours",
              },
            ],
          },
          {
            dayNumber: 7,
            hotel: {
              name: "Rayavadee Resort",
              location: "Railay Beach, Krabi",
              rating: 5,
            },
            activities: [
              {
                name: "VIP Departure",
                description:
                  "Private transfer to Krabi Airport with express check-in and lounge access for your departure.",
                time: "11:00 AM",
                location: "Krabi Airport",
                category: "relaxation",
                duration: "2 hours",
              },
            ],
          },
        ],
      },
    ]

    // Create all itineraries
    const allItineraries = [...phuketItineraries, ...krabiItineraries]

    for (const itineraryData of allItineraries) {
      console.log(`Creating itinerary: ${itineraryData.title}`)

      // Create activities and days
      const createdDays = []

      for (const dayData of itineraryData.days) {
        // Create activities for this day
        const createdActivities = []

        for (const activityData of dayData.activities) {
          const activity = await Activity.create(activityData)
          createdActivities.push(activity._id)
        }

        // Create day with activity references
        const day = await Day.create({
          ...dayData,
          activities: createdActivities,
        })

        createdDays.push(day._id)
      }

      // Create itinerary with day references
      await Itinerary.create({
        ...itineraryData,
        days: createdDays,
      })
    }

    console.log("✅ Seed data created successfully!")
    console.log(`Created ${allItineraries.length} itineraries with full details`)
    console.log("Destinations: Phuket, Krabi")
    console.log("Duration range: 3-7 nights")
    console.log("All itineraries marked as recommended")

    process.exit(0)
  } catch (error) {
    console.error("❌ Error creating seed data:", error)
    process.exit(1)
  }
}

// Run the seed function
seedData()
