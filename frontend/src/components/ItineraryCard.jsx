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
    <div className="bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
      {/* Header Image Placeholder */}
      <div className="h-48 bg-gradient-to-r from-primary/20 to-secondary/20 relative overflow-hidden">
        <img
          src={`/abstract-geometric-shapes.png?height=192&width=400&query=${destination} travel destination`}
          alt={destination}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-4 right-4">
          <span className="bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium">
            {numberOfNights} nights
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Title and Location */}
        <div className="mb-3">
          <h3 className="font-heading font-semibold text-lg text-card-foreground mb-1 line-clamp-2">{title}</h3>
          <div className="flex items-center text-muted-foreground text-sm">
            <MapPin className="h-4 w-4 mr-1" />
            <span>{destination}</span>
          </div>
        </div>

        {/* Description */}
        {description && <p className="text-muted-foreground text-sm mb-4 line-clamp-3">{description}</p>}

        {/* Highlights */}
        {highlights.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-card-foreground mb-2">Highlights:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              {highlights.slice(0, 3).map((highlight, index) => (
                <li key={index} className="flex items-start">
                  <span className="w-1 h-1 bg-primary rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  {highlight}
                </li>
              ))}
              {highlights.length > 3 && <li className="text-primary text-xs">+{highlights.length - 3} more</li>}
            </ul>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-secondary/10 text-secondary border border-secondary/20"
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </span>
            ))}
            {tags.length > 3 && <span className="text-xs text-muted-foreground">+{tags.length - 3}</span>}
          </div>
        )}

        {/* Meta Information */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            <span>{totalDays} days</span>
          </div>
          {budget && (
            <div className="flex items-center">
              <span>
                ${budget.min} - ${budget.max}
              </span>
            </div>
          )}
          {bestTimeToVisit && (
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              <span>{bestTimeToVisit}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <Link
          to={`/itineraries/${_id}`}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center group"
        >
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </Link>

        {/* Created Date */}
        <div className="mt-3 text-xs text-muted-foreground text-center">Created {formatDate(createdAt)}</div>
      </div>
    </div>
  )
}

export default ItineraryCard
