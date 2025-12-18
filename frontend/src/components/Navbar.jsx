"use client"

import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Menu, X, MapPin, Plus, List, Compass, Home, LogIn, UserPlus } from "lucide-react"

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const navigation = [
    { name: "Home", href: "/", icon: Home },
    { name: "Browse Itineraries", href: "/itineraries", icon: List },
    { name: "Create Itinerary", href: "/create", icon: Plus },
    { name: "Recommendations", href: "/recommendations", icon: Compass },
    // {className: "SearchBar", href}
  ]

  const isActive = (path) => location.pathname === path

  return (
    <nav className="bg-background border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <MapPin className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
              </div>
              <span className="font-heading font-bold text-xl text-foreground">TravelPlan</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    isActive(item.href)
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground hover:text-primary hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
            
            {/* Login/Account Buttons */}
            <div className="flex items-center space-x-2 ml-6 pl-6 border-l border-border">
              {isLoggedIn ? (
                <button
                  onClick={() => setIsLoggedIn(false)}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-md text-sm font-medium text-foreground hover:text-primary hover:bg-muted transition-all duration-200"
                >
                  <LogIn className="h-4.5 w-4.5" />
                  <span>Logout</span>
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-md text-sm font-medium text-foreground hover:text-primary hover:bg-muted transition-all duration-200"
                  >
                    <LogIn className="h-4.5 w-4.5" />
                    <span>Login</span>
                  </Link>
                  <Link
                    to="/signup"
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <UserPlus className="h-4.5 w-4.5" />
                    <span>Sign Up</span>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="text-muted-foreground hover:text-foreground p-2">
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-card border-t border-border">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive(item.href) ? "bg-primary text-primary-foreground" : "text-card-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
            
            {/* Mobile Login/Account Buttons */}
            <div className="px-3 py-2 border-t border-border mt-2 pt-3 space-y-2">
              {isLoggedIn ? (
                <button
                  onClick={() => {
                    setIsLoggedIn(false)
                    setIsOpen(false)
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-card-foreground hover:bg-muted transition-colors"
                >
                  <LogIn className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-card-foreground hover:bg-muted transition-colors"
                  >
                    <LogIn className="h-5 w-5" />
                    <span>Login</span>
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setIsOpen(false)}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <UserPlus className="h-5 w-5" />
                    <span>Sign Up</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navbar
