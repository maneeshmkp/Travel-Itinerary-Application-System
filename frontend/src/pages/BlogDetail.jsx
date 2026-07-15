"use client"

import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Calendar, Clock, MapPin, User, Tag } from "lucide-react"
import { blogAPI } from "../services/api"
import LoadingSpinner from "../components/LoadingSpinner"
import ErrorMessage from "../components/ErrorMessage"
import DestinationHeroImage from "../components/DestinationHeroImage"
import { BLOG_TAG_LABELS } from "../constants/blogTags"

function renderParagraphs(content) {
  return String(content || "")
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, idx) => {
      const lines = block.split("\n")
      if (lines.some((l) => l.trim().startsWith("- "))) {
        return (
          <ul key={idx} className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
            {lines
              .filter((l) => l.trim().startsWith("- "))
              .map((line, i) => (
                <li key={i}>{formatInline(line.replace(/^-\s*/, ""))}</li>
              ))}
          </ul>
        )
      }
      return (
        <p key={idx} className="text-muted-foreground leading-relaxed mb-6 text-base md:text-lg">
          {formatInline(block)}
        </p>
      )
    })
}

function formatInline(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}

export default function BlogDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [blog, setBlog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadBlog = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await blogAPI.getBySlug(slug)
      setBlog(res.data?.data ?? null)
      if (!res.data?.data) setError("Article not found")
    } catch {
      setError("Could not load this article.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (slug) loadBlog()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-16">
        <LoadingSpinner message="Loading article…" />
      </div>
    )
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen bg-background py-16 px-4">
        <ErrorMessage message={error || "Article not found"} onRetry={loadBlog} />
        <div className="text-center mt-6">
          <Link to="/blogs" className="text-primary font-medium hover:underline">
            ← Back to Travel Blog
          </Link>
        </div>
      </div>
    )
  }

  const publishedLabel = blog.publishedAt
    ? new Date(blog.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null

  return (
    <article className="min-h-screen bg-background pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors text-sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>

        {(blog.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {blog.tags.map((tag) => (
              <Link
                key={tag}
                to={`/blogs?tag=${encodeURIComponent(tag)}`}
                className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-primary bg-primary/10 px-2.5 py-1 rounded-full hover:bg-primary/15"
              >
                <Tag className="h-3 w-3" />
                {BLOG_TAG_LABELS[tag] || tag}
              </Link>
            ))}
          </div>
        )}

        <h1 className="font-heading font-bold text-3xl md:text-4xl text-foreground mb-4 leading-tight">
          {blog.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8">
          <span className="inline-flex items-center gap-1.5">
            <User className="h-4 w-4 text-primary" />
            {blog.authorName || "TravelPlan Team"}
          </span>
          {publishedLabel && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" />
              {publishedLabel}
            </span>
          )}
          {blog.readMinutes && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary" />
              {blog.readMinutes} min read
            </span>
          )}
          {blog.destination && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary" />
              {blog.destination}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
        <DestinationHeroImage
          destination={blog.destination}
          title={blog.title}
          tags={blog.tags}
          coverImage={blog.coverImage}
          heightClass="h-56 md:h-80"
          roundedClass="rounded-2xl"
        />
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {blog.excerpt && (
          <p className="text-lg md:text-xl text-foreground font-medium leading-relaxed mb-8 border-l-4 border-primary pl-4">
            {blog.excerpt}
          </p>
        )}

        <div className="prose-blog">{renderParagraphs(blog.content)}</div>

        <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-4">
          <Link
            to="/blogs"
            className="inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            More articles
          </Link>
          <Link
            to="/ai-itinerary"
            className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Plan your trip with AI
          </Link>
        </div>
      </div>
    </article>
  )
}
