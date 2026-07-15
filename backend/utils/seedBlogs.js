import dotenv from "dotenv"
import connectDB from "../config/db.js"
import Blog from "../models/Blog.js"
import { slugify } from "./slugify.js"
import { VERIFIED_UNSPLASH } from "../config/tripImageFallbacks.js"

dotenv.config()

function curatedCover(url, alt, query) {
  return {
    url,
    urls: [url],
    alt,
    source: String(url).includes("wikimedia.org") ? "wikimedia" : "curated",
    query,
  }
}

const SAMPLE_BLOGS = [
  {
    title: "Goa on a Budget: 3 Nights Under ₹20,000",
    coverImage: curatedCover(
      VERIFIED_UNSPLASH.goaBeach,
      "Goa beach, India",
      "Goa beach India",
    ),
    excerpt:
      "Beach stays, local food, and scooter days — how to enjoy North Goa without overspending on your next long weekend.",
    destination: "Goa, India",
    authorName: "TravelPlan Team",
    tags: ["budget-tips", "beaches", "destinations"],
    isFeatured: true,
    readMinutes: 6,
    content: `Goa remains one of India's best-value beach escapes if you plan smart. A three-night trip under ₹20,000 per person is realistic when you mix budget stays in Calangute or Baga with street food and rented scooters.

**Where to stay:** Look at guesthouses slightly inland from the main beach strip — rates drop sharply while you're still a short ride from the sand.

**Eat like a local:** Fish thali lunches, beach shacks for dinner, and breakfast at small cafés beat hotel buffets every time.

**Getting around:** Rent a scooter for two days instead of relying on taxis. Split fuel and parking with a travel partner.

**Best months:** November through February offer pleasant weather and manageable crowds before peak holiday pricing kicks in.`,
  },
  {
    title: "Jim Corbett First-Timer's Guide: Safari, Stays & Timing",
    coverImage: curatedCover(
      VERIFIED_UNSPLASH.rishikeshNature,
      "Forest and river landscape, Uttarakhand, India",
      "Jim Corbett National Park wildlife India",
    ),
    excerpt:
      "When to book zones, what to pack, and how to pair wildlife mornings with relaxed resort afternoons in Uttarakhand.",
    destination: "Jim Corbett National Park, Uttarakhand, India",
    authorName: "TravelPlan Team",
    tags: ["wildlife", "adventure", "itinerary-ideas"],
    isFeatured: true,
    readMinutes: 7,
    content: `Jim Corbett is India's oldest national park and still one of the most accessible tiger habitats from Delhi NCR.

**Zones matter:** Dhikala and Bijrani are popular for jeep safaris; book permits early in peak season (October–June).

**Stay strategy:** Resorts near Ramnagar cut transfer time; boutique properties inside buffer zones feel immersive but cost more.

**Typical day:** Dawn safari, late breakfast, pool or nature walk, early dinner, and lights out before the next morning drive.

**Pack light:** Neutral clothing, binoculars, reusable water bottle, and a light jacket for winter mornings.`,
  },
  {
    title: "Kerala Backwaters: Alleppey vs Kumarakom",
    coverImage: curatedCover(
      VERIFIED_UNSPLASH.andamanBoats,
      "Traditional boats on calm backwaters, Kerala, India",
      "Kerala backwaters houseboat India",
    ),
    excerpt:
      "Houseboat routes, monsoon pros and cons, and which base works best for families versus couples.",
    destination: "Kerala, India",
    authorName: "Priya Menon",
    tags: ["destinations", "culture", "seasonal"],
    readMinutes: 5,
    content: `Kerala's backwaters look similar on postcards but feel different on the water.

**Alleppey** has the widest houseboat fleet and livelier canal traffic — great for first-timers who want classic photos and easy logistics.

**Kumarakom** is quieter, with bird sanctuaries nearby and a slower pace ideal for honeymoons or wellness-focused trips.

**Season tip:** September–March is prime. Monsoon greenery is stunning but rain can disrupt outdoor plans.

**Budget angle:** Shared day cruises cost far less than overnight private houseboats — consider one night on board and two nights in a homestay.`,
  },
  {
    title: "Street Food Walks: What to Try in Old Delhi",
    coverImage: curatedCover(
      VERIFIED_UNSPLASH.indiaGate,
      "India Gate, New Delhi",
      "Old Delhi street food India",
    ),
    excerpt:
      "Chandni Chowk essentials from parathas to jalebis — and how to eat safely while exploring.",
    destination: "Delhi, India",
    authorName: "TravelPlan Team",
    tags: ["food", "culture", "destinations"],
    readMinutes: 4,
    content: `Old Delhi rewards curious eaters who go early and follow the crowds.

Start at **Paranthe Wali Gali** for stuffed breads, then sample **chaat** near Fatehpuri Masjid. Finish with hot **jalebi** if you have a sweet tooth.

**Safety basics:** Choose busy stalls with high turnover, avoid pre-cut fruit sitting out, and carry hand sanitizer.

**Timing:** Weekday mornings beat weekend afternoons for shorter queues and cooler walks between stops.`,
  },
  {
    title: "Carry-On Only: Packing List for 5-Day India Trips",
    coverImage: curatedCover(
      VERIFIED_UNSPLASH.shimlaHills,
      "Hills and valleys for mixed-climate India travel",
      "India travel packing hills",
    ),
    excerpt:
      "One backpack, mixed climates, and temple visits — a practical packing formula that actually works.",
    destination: "India",
    authorName: "TravelPlan Team",
    tags: ["packing", "budget-tips", "itinerary-ideas"],
    readMinutes: 5,
    content: `Five days in India often means cities plus coast or hills. Pack layers instead of duplicates.

**Clothing:** Two breathable tops, one light sweater, one modest outfit for temples, comfortable walking shoes, and sandals.

**Toiletries:** Travel-size kit, sunscreen, insect repellent, and any prescription meds in original packaging.

**Tech:** Universal adapter, power bank, and offline maps downloaded before you land.

**Pro tip:** Roll clothes, use packing cubes, and leave room for snacks and souvenirs on the return leg.`,
  },
  {
    title: "Best Time to Visit Rajasthan Without the Heat",
    coverImage: curatedCover(
      VERIFIED_UNSPLASH.jaipurHeritage,
      "Jaipur heritage architecture, Rajasthan, India",
      "Rajasthan Jaipur heritage India",
    ),
    excerpt:
      "Fort cities, desert camps, and festival calendars — plan Jaipur, Jodhpur, and Udaipur with comfort in mind.",
    destination: "Rajasthan, India",
    authorName: "TravelPlan Team",
    tags: ["seasonal", "culture", "destinations"],
    readMinutes: 6,
    content: `Rajasthan's palaces shine brightest when the sun isn't working against you.

**Ideal window:** Late October through early March brings daytime temperatures suited to fort hopping and old-city walks.

**City pacing:** Do outdoor sights before 11 a.m., rest midday, then explore markets at sunset when the light is golden.

**Desert camps:** One night near Jaisalmer is enough for most travelers — book a jeep transfer and stargazing dinner package in advance.

**Festivals:** Diwali and Holi add energy but also crowds; reserve hotels early if your dates overlap major events.`,
  },
]

async function seedBlogs() {
  await connectDB()
  console.log("Seeding travel blogs…\n")

  await Blog.deleteMany({})
  let created = 0

  for (const post of SAMPLE_BLOGS) {
    const slug = slugify(post.title)
    const { coverImage, ...fields } = post

    await Blog.create({
      ...fields,
      slug,
      status: "published",
      publishedAt: new Date(Date.now() - created * 86400000 * 3),
      coverImage,
    })
    created += 1
    console.log(`  ✓ ${post.title}`)
  }

  console.log(`\nDone — ${created} blog posts seeded.`)
  process.exit(0)
}

seedBlogs().catch((err) => {
  console.error(err)
  process.exit(1)
})
