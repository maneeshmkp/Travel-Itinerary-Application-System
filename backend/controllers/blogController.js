import Blog from "../models/Blog.js"

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function formatBlogListItem(doc) {
  const b = doc.toObject ? doc.toObject() : doc
  return {
    _id: b._id,
    title: b.title,
    slug: b.slug,
    excerpt: b.excerpt,
    destination: b.destination,
    authorName: b.authorName,
    tags: b.tags || [],
    coverImage: b.coverImage,
    isFeatured: b.isFeatured,
    readMinutes: b.readMinutes,
    publishedAt: b.publishedAt,
    createdAt: b.createdAt,
  }
}

/** GET /api/blogs */
export const getBlogs = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(24, Math.max(1, Number(req.query.limit) || 9))
    const skip = (page - 1) * limit

    const filter = { status: "published" }

    const tag = String(req.query.tag || "").trim()
    if (tag) filter.tags = tag

    const destination = String(req.query.destination || "").trim()
    if (destination) {
      filter.destination = new RegExp(escapeRegex(destination), "i")
    }

    const search = String(req.query.search || req.query.q || "").trim()
    if (search) {
      filter.$or = [
        { title: new RegExp(escapeRegex(search), "i") },
        { excerpt: new RegExp(escapeRegex(search), "i") },
        { destination: new RegExp(escapeRegex(search), "i") },
        { tags: new RegExp(escapeRegex(search), "i") },
      ]
    }

    const [items, total] = await Promise.all([
      Blog.find(filter).sort({ isFeatured: -1, publishedAt: -1 }).skip(skip).limit(limit),
      Blog.countDocuments(filter),
    ])

    res.status(200).json({
      success: true,
      count: items.length,
      data: items.map(formatBlogListItem),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    })
  } catch (error) {
    next(error)
  }
}

/** GET /api/blogs/:slug */
export const getBlogBySlug = async (req, res, next) => {
  try {
    const slug = String(req.params.slug || "").trim().toLowerCase()
    const blog = await Blog.findOne({ slug, status: "published" })

    if (!blog) {
      return res.status(404).json({ success: false, error: "Blog post not found" })
    }

    res.status(200).json({
      success: true,
      data: blog,
    })
  } catch (error) {
    next(error)
  }
}
