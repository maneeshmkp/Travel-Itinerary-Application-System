import { Calendar, Clock, MapPin, User } from "lucide-react"
import { Link } from "react-router-dom"
import DestinationHeroImage from "./DestinationHeroImage"
import { BLOG_TAG_LABELS } from "../constants/blogTags"

export default function BlogCard({ blog }) {
  const {
    slug,
    title,
    excerpt,
    destination,
    authorName,
    tags = [],
    coverImage,
    readMinutes,
    publishedAt,
    isFeatured,
  } = blog

  const publishedLabel = publishedAt
    ? new Date(publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null

  return (
    <article className="card-hover bg-card border border-border rounded-xl shadow-sm overflow-hidden group flex flex-col h-full">
      <DestinationHeroImage
        destination={destination}
        title={title}
        tags={tags}
        coverImage={coverImage}
        heightClass="h-48"
        roundedClass="rounded-t-xl"
        badge={
          isFeatured ? (
            <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-semibold shadow-md">
              Featured
            </span>
          ) : null
        }
      />

      <div className="p-6 flex flex-col flex-1">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[10px] uppercase tracking-wide font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full"
              >
                {BLOG_TAG_LABELS[tag] || tag}
              </span>
            ))}
          </div>
        )}

        <h3 className="font-heading font-semibold text-lg text-card-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          <Link to={`/blogs/${slug}`}>{title}</Link>
        </h3>

        {destination && (
          <div className="flex items-center text-muted-foreground text-sm mb-3">
            <MapPin className="h-4 w-4 mr-1.5 text-primary shrink-0" />
            <span className="line-clamp-1">{destination}</span>
          </div>
        )}

        {excerpt && (
          <p className="text-muted-foreground text-sm mb-4 line-clamp-3 leading-relaxed flex-1">{excerpt}</p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-auto pt-4 border-t border-border/60">
          <span className="inline-flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {authorName || "TravelPlan"}
          </span>
          {publishedLabel && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {publishedLabel}
            </span>
          )}
          {readMinutes && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {readMinutes} min read
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
