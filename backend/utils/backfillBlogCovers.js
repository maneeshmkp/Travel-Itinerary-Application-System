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

/** Unique cover per seeded article — keyed by slug */
const COVERS_BY_SLUG = {
  [slugify("Goa on a Budget: 3 Nights Under ₹20,000")]: curatedCover(
    VERIFIED_UNSPLASH.goaBeach,
    "Goa beach, India",
    "Goa beach India",
  ),
  [slugify("Jim Corbett First-Timer's Guide: Safari, Stays & Timing")]: curatedCover(
    VERIFIED_UNSPLASH.rishikeshNature,
    "Forest and river landscape, Uttarakhand, India",
    "Jim Corbett National Park wildlife India",
  ),
  [slugify("Kerala Backwaters: Alleppey vs Kumarakom")]: curatedCover(
    VERIFIED_UNSPLASH.andamanBoats,
    "Traditional boats on calm backwaters, Kerala, India",
    "Kerala backwaters houseboat India",
  ),
  [slugify("Street Food Walks: What to Try in Old Delhi")]: curatedCover(
    VERIFIED_UNSPLASH.indiaGate,
    "India Gate, New Delhi",
    "Old Delhi street food India",
  ),
  [slugify("Carry-On Only: Packing List for 5-Day India Trips")]: curatedCover(
    VERIFIED_UNSPLASH.shimlaHills,
    "Hills and valleys for mixed-climate India travel",
    "India travel packing hills",
  ),
  [slugify("Best Time to Visit Rajasthan Without the Heat")]: curatedCover(
    VERIFIED_UNSPLASH.jaipurHeritage,
    "Jaipur heritage architecture, Rajasthan, India",
    "Rajasthan Jaipur heritage India",
  ),
}

async function backfillBlogCovers() {
  await connectDB()
  const blogs = await Blog.find({})
  let updated = 0

  for (const blog of blogs) {
    const cover = COVERS_BY_SLUG[blog.slug]
    if (!cover) continue
    if (blog.coverImage?.url === cover.url) continue

    blog.coverImage = cover
    await blog.save()
    updated += 1
    console.log(`  ✓ ${blog.title}`)
  }

  console.log(`\nUpdated ${updated} blog cover image(s).`)
  process.exit(0)
}

backfillBlogCovers().catch((err) => {
  console.error(err)
  process.exit(1)
})
