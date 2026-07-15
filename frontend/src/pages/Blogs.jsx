"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Search, BookOpen, Tag } from "lucide-react"
import { blogAPI } from "../services/api"
import BlogCard from "../components/BlogCard"
import LoadingSpinner from "../components/LoadingSpinner"
import ErrorMessage from "../components/ErrorMessage"
import { useDebouncedValue } from "../hooks/useDebouncedValue"
import { BLOG_TAG_OPTIONS, BLOG_TAG_LABELS } from "../constants/blogTags"

export default function Blogs() {
  const [searchParams] = useSearchParams()
  const urlTag = searchParams.get("tag") ?? ""

  const [inputValue, setInputValue] = useState("")
  const debouncedSearch = useDebouncedValue(inputValue, 400)
  const [tagFilter, setTagFilter] = useState(urlTag)

  useEffect(() => {
    setTagFilter(urlTag)
  }, [urlTag])
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({ page: 1, limit: 9, total: 0, pages: 1 })

  const loadBlogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await blogAPI.getAll({
        page: 1,
        limit: 12,
        ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
        ...(tagFilter && { tag: tagFilter }),
      })
      setBlogs(res.data?.data ?? [])
      setPagination(res.data?.pagination ?? { page: 1, limit: 12, total: 0, pages: 1 })
    } catch {
      setError("Failed to load blog posts. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, tagFilter])

  useEffect(() => {
    loadBlogs()
  }, [loadBlogs])

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-10 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center gap-2 text-primary mb-3">
            <BookOpen className="h-8 w-8" />
          </div>
          <h1 className="font-heading font-bold text-3xl md:text-4xl text-foreground mb-3">Travel Blog</h1>
          <p className="text-muted-foreground text-lg">
            Destination guides, budget tips, and itinerary inspiration from the TravelPlan team.
          </p>
        </header>

        <div className="mb-8 flex flex-col lg:flex-row gap-4">
          <form
            onSubmit={(e) => e.preventDefault()}
            className="form-search-shell flex-1 max-w-xl"
          >
            <div className="flex flex-1 items-center pl-3 min-w-0">
              <Search className="h-4 w-4 text-gray-400 shrink-0" />
              <input
                type="search"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Search articles, destinations…"
                className="form-search-input"
                aria-label="Search blog posts"
              />
            </div>
          </form>

          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="form-select min-w-[10rem]"
              aria-label="Filter by topic"
            >
              <option value="">All topics</option>
              {BLOG_TAG_OPTIONS.map((tag) => (
                <option key={tag} value={tag}>
                  {BLOG_TAG_LABELS[tag] || tag}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading articles…" />
        ) : error ? (
          <ErrorMessage message={error} onRetry={loadBlogs} />
        ) : blogs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg font-medium text-foreground mb-2">No articles found</p>
            <p className="text-muted-foreground mb-6">Try a different search or clear the topic filter.</p>
            <button
              type="button"
              onClick={() => {
                setInputValue("")
                setTagFilter("")
              }}
              className="text-primary font-medium hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              {pagination.total} article{pagination.total === 1 ? "" : "s"}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogs.map((blog) => (
                <BlogCard key={blog._id} blog={blog} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
