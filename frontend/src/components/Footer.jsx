import { MapPin, Mail, Phone, Github, Twitter, Instagram } from "lucide-react"

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-5">
              <div className="relative">
                <MapPin className="h-8 w-8 text-primary" />
              </div>
              <span className="font-heading font-bold text-xl text-card-foreground">TravelPlan</span>
            </div>
            <p className="text-muted-foreground mb-6 max-w-md leading-relaxed font-medium">
              Create and discover amazing travel itineraries for your next adventure. From tropical beaches to cultural
              experiences, plan your perfect trip with us.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-primary hover:bg-muted p-2 rounded-lg transition-all duration-200">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary hover:bg-muted p-2 rounded-lg transition-all duration-200">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary hover:bg-muted p-2 rounded-lg transition-all duration-200">
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-heading font-semibold text-card-foreground mb-5 text-sm uppercase tracking-wide">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <a href="/itineraries" className="text-muted-foreground hover:text-primary hover:translate-x-1 transition-all duration-200 inline-block font-medium">
                  Browse Itineraries
                </a>
              </li>
              <li>
                <a href="/create" className="text-muted-foreground hover:text-primary hover:translate-x-1 transition-all duration-200 inline-block font-medium">
                  Create Itinerary
                </a>
              </li>
              <li>
                <a href="/recommendations" className="text-muted-foreground hover:text-primary hover:translate-x-1 transition-all duration-200 inline-block font-medium">
                  Recommendations
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary hover:translate-x-1 transition-all duration-200 inline-block font-medium">
                  About Us
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-heading font-semibold text-card-foreground mb-5 text-sm uppercase tracking-wide">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-center space-x-3 text-muted-foreground hover:text-foreground transition-colors duration-200">
                <Mail className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="font-medium">hello@travelplan.com</span>
              </li>
              <li className="flex items-center space-x-3 text-muted-foreground hover:text-foreground transition-colors duration-200">
                <Phone className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="font-medium">+91 (807) 743-9938</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 text-center">
          <p className="text-muted-foreground text-sm font-medium">© 2025 TravelPlan. All rights reserved. Built with ❤️ for travelers.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer

