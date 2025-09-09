"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { MapPin, Plus, Compass, Star, ArrowRight, Calendar, Users, Globe } from "lucide-react"
import { recommendationAPI } from "../services/api"
import LoadingSpinner from "../components/LoadingSpinner"
import ErrorMessage from "../components/ErrorMessage"

const Home = () => {
  const [destinations, setDestinations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDestinations = async () => {
    try {
      setError(null)
      const response = await recommendationAPI.getDestinations()
      setDestinations(response.data.data.slice(0, 6))
    } catch (error) {
      console.error("Error fetching destinations:", error)
      setError("Failed to load destinations. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDestinations()
  }, [])

  const features = [
    {
      icon: Calendar,
      title: "Smart Planning",
      description: "Create detailed day-by-day itineraries with activities, hotels, and transfers.",
    },
    {
      icon: Compass,
      title: "Expert Recommendations",
      description: "Get curated suggestions based on your preferences and travel style.",
    },
    {
      icon: Users,
      title: "Community Driven",
      description: "Browse and share itineraries created by fellow travelers.",
    },
    {
      icon: Globe,
      title: "Global Destinations",
      description: "Discover amazing places from tropical beaches to cultural cities.",
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="font-heading font-bold text-4xl md:text-6xl text-foreground mb-6">
              Plan Your Perfect
              <span className="text-primary block">Travel Adventure</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              Create detailed itineraries, discover amazing destinations, and turn your travel dreams into reality. From
              tropical getaways to cultural explorations, we've got you covered.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/create"
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 rounded-lg font-medium transition-colors flex items-center justify-center group"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Itinerary
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/recommendations"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-8 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                <Compass className="h-5 w-5 mr-2" />
                Get Recommendations
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-card-foreground mb-4">
              Why Choose TravelPlan?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to plan, organize, and enjoy your perfect trip
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={index}
                  className="text-center p-6 rounded-lg bg-background border border-border hover:shadow-md transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-heading font-semibold text-lg text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Popular Destinations */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground mb-4">Popular Destinations</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore our most loved travel destinations with ready-made itineraries
            </p>
          </div>

          {loading ? (
            <LoadingSpinner size="lg" text="Loading destinations..." />
          ) : error ? (
            <ErrorMessage title="Failed to load destinations" message={error} onRetry={fetchDestinations} />
          ) : destinations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {destinations.map((destination, index) => (
                <div
                  key={index}
                  className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-all duration-300 animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-heading font-semibold text-xl text-card-foreground">
                      {destination.destination}
                    </h3>
                    <div className="flex items-center text-secondary">
                      <Star className="h-4 w-4 mr-1" />
                      <span className="text-sm font-medium">{destination.itineraryCount}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-muted-foreground text-sm mb-2">
                      {destination.nightRange.min} - {destination.nightRange.max} nights available
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {destination.tags.slice(0, 3).map((tag, tagIndex) => (
                        <span
                          key={tagIndex}
                          className="px-2 py-1 bg-secondary/10 text-secondary text-xs rounded-full border border-secondary/20"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Link
                    to={`/recommendations?destination=${encodeURIComponent(destination.destination)}`}
                    className="text-primary hover:text-primary/80 font-medium text-sm flex items-center group"
                  >
                    View Itineraries
                    <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No destinations available yet.</p>
            </div>
          )}

          <div className="text-center mt-12">
            <Link
              to="/itineraries"
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 rounded-lg font-medium transition-colors inline-flex items-center"
            >
              Browse All Itineraries
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading font-bold text-3xl md:text-4xl mb-4">Ready to Start Planning?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of travelers who trust TravelPlan for their adventures
          </p>
          <Link
            to="/create"
            className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 px-8 py-3 rounded-lg font-medium transition-colors inline-flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Your First Itinerary
          </Link>
        </div>
      </section>
    </div>
  )
}

export default Home
