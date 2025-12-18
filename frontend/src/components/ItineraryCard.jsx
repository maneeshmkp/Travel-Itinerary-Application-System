import { Calendar, MapPin, Clock, Tag, Eye } from "lucide-react"
import { Link } from "react-router-dom"

const ItineraryCard = ({ itinerary }) => {
  const {
    _id,
    title,
    destination,
    numberOfNights,
    totalDays,
    description,
    highlights = [],
    tags = [],
    budget,
    bestTimeToVisit,
    createdAt,
  } = itinerary

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="card-hover bg-card border border-border rounded-xl shadow-sm overflow-hidden group">
      {/* Header Image Placeholder */}
      <div className="h-48 bg-gradient-to-br from-primary/20 to-secondary/20 relative overflow-hidden">
        <img
          src={`/abstract-geometric-shapes.png?height=192&width=400&query=${destination} travel destination`}
          alt={destination}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-4 right-4">
          <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold shadow-md">
            {numberOfNights} nights
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 md:p-7">
        {/* Title and Location */}
        <div className="mb-4">
          <h3 className="font-heading font-semibold text-lg md:text-xl text-card-foreground mb-2 line-clamp-2">{title}</h3>
          <div className="flex items-center text-muted-foreground text-sm font-medium">
            <MapPin className="h-4 w-4 mr-1.5 text-primary flex-shrink-0" />
            <span>{destination}</span>
          </div>
        </div>

        {/* Description */}
        {description && <p className="text-muted-foreground text-sm mb-4 line-clamp-3 leading-relaxed">{description}</p>}

        {/* Highlights */}
        {highlights.length > 0 && (
          <div className="mb-5">
            <h4 className="text-xs font-semibold text-card-foreground mb-2 uppercase tracking-wide">Highlights:</h4>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              {highlights.slice(0, 3).map((highlight, index) => (
                <li key={index} className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                  <span>{highlight}</span>
                </li>
              ))}
              {highlights.length > 3 && <li className="text-primary text-xs font-medium">+{highlights.length - 3} more</li>}
            </ul>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-secondary/10 text-secondary border border-secondary/20"
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </span>
            ))}
            {tags.length > 3 && <span className="text-xs text-muted-foreground px-2.5 py-1">+{tags.length - 3}</span>}
          </div>
        )}

        {/* Meta Information */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground mb-5 pb-5 border-b border-border">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
            <span>{totalDays} days</span>
          </div>
          {budget && (
            <div className="flex items-center gap-1.5">
              <span className="text-primary font-semibold">${budget.min}</span>
              <span className="text-muted-foreground">-</span>
              <span className="text-primary font-semibold">${budget.max}</span>
            </div>
          )}
          {bestTimeToVisit && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary flex-shrink-0" />
              <span>{bestTimeToVisit}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <Link
          to={`/itineraries/${_id}`}
          className="w-full button-primary justify-center shadow-sm hover:shadow-md mb-3"
        >
          <Eye className="h-4 w-4" />
          <span>View Details</span>
        </Link>

        {/* Created Date */}
        <div className="text-xs text-muted-foreground text-center">Created {formatDate(createdAt)}</div>
      </div>
    </div>
  )
}

export default ItineraryCard

