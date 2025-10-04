import { MapPin, Mail, Phone, Github, Twitter, Instagram } from "lucide-react"

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <MapPin className="h-8 w-8 text-primary" />
              <span className="font-heading font-bold text-xl text-card-foreground">TravelPlan</span>
            </div>
            <p className="text-muted-foreground mb-4 max-w-md">
              Create and discover amazing travel itineraries for your next adventure. From tropical beaches to cultural
              experiences, plan your perfect trip with us.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-heading font-semibold text-card-foreground mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <a href="/itineraries" className="text-muted-foreground hover:text-primary transition-colors">
                  Browse Itineraries
                </a>
              </li>
              <li>
                <a href="/create" className="text-muted-foreground hover:text-primary transition-colors">
                  Create Itinerary
                </a>
              </li>
              <li>
                <a href="/recommendations" className="text-muted-foreground hover:text-primary transition-colors">
                  Recommendations
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  About Us
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-heading font-semibold text-card-foreground mb-4">Contact</h3>
            <ul className="space-y-2">
              <li className="flex items-center space-x-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>hello@travelplan.com</span>
              </li>
              <li className="flex items-center space-x-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>+91 (807) 743-9938</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center">
          <p className="text-muted-foreground">© TravelPlan. All rights reserved. Built with ❤️ for travelers.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
