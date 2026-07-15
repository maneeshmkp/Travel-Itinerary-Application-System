import mongoose from "mongoose"
import { BLOG_TAG_OPTIONS } from "../constants/blogTags.js"

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Blog title is required"],
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    excerpt: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    content: {
      type: String,
      required: [true, "Blog content is required"],
    },
    destination: {
      type: String,
      trim: true,
    },
    authorName: {
      type: String,
      trim: true,
      default: "TravelPlan Team",
    },
    tags: [
      {
        type: String,
        enum: BLOG_TAG_OPTIONS,
      },
    ],
    coverImage: {
      url: String,
      alt: String,
      source: String,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "published",
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    readMinutes: {
      type: Number,
      min: 1,
      default: 5,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
)

blogSchema.index({ status: 1, publishedAt: -1 })
blogSchema.index({ title: "text", excerpt: "text", destination: "text", content: "text" })

const Blog = mongoose.model("Blog", blogSchema)
export default Blog
