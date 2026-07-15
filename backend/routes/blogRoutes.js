import express from "express"
import { getBlogs, getBlogBySlug } from "../controllers/blogController.js"
import { publicApiRateLimiter } from "../middlewares/rateLimiter.js"

const router = express.Router()

router.get("/", publicApiRateLimiter, getBlogs)
router.get("/:slug", publicApiRateLimiter, getBlogBySlug)

export default router
