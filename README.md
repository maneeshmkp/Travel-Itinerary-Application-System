# Itinerary Builder App

A full-stack travel itinerary builder application that allows users to create, browse, and discover amazing travel itineraries. Built with React, Node.js, Express, and MongoDB.

## 🌟 Features

### Frontend (React + Tailwind CSS)
- **Modern UI**: Clean, professional design with travel-themed color palette
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Interactive Components**: Smooth animations and hover effects
- **Advanced Search**: Filter itineraries by destination, duration, tags, and budget
- **Detailed Views**: Comprehensive itinerary pages with day-by-day breakdowns

### Backend (Node.js + Express + MongoDB)
- **RESTful API**: Well-structured endpoints for all operations
- **Database Models**: Proper relationships between Itineraries, Days, and Activities
- **Advanced Querying**: Search, filter, and pagination support
- **Recommendation System**: Smart suggestions based on user preferences
- **Error Handling**: Comprehensive error handling and validation

### Key Functionality
- ✅ Create detailed itineraries with hotels, activities, and transfers
- ✅ Browse and search existing itineraries
- ✅ Get personalized recommendations
- ✅ View similar itineraries
- ✅ Responsive design for all devices
- ✅ Professional travel-themed UI

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account or local MongoDB installation
- Git

### Backend Setup

1. **Navigate to backend directory**
   \`\`\`bash
   cd backend
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Environment Configuration**
   Create a `.env` file in the backend directory:
   \`\`\`env
   MONGO_URI=mongodb+srv://your-username:your-password@cluster.mongodb.net/itinerary-builder
   PORT=5000
   NODE_ENV=development
   \`\`\`

4. **Seed the database**
   \`\`\`bash
   npm run seed
   \`\`\`

5. **Start the backend server**
   \`\`\`bash
   npm run dev
   \`\`\`

### Frontend Setup

1. **Navigate to frontend directory**
   \`\`\`bash
   cd frontend
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Start the development server**
   \`\`\`bash
   npm run dev
   \`\`\`

4. **Open your browser**
   Visit `http://localhost:3000` to see the application

## 📁 Project Structure

\`\`\`
root/
├── backend/                 # Node.js + Express + MongoDB
│   ├── config/             # Database connection
│   ├── models/             # Mongoose models
│   ├── routes/             # Express routes
│   ├── controllers/        # Route controllers
│   ├── middlewares/        # Error handling, validation
│   ├── utils/              # Seed data, helpers
│   ├── app.js              # Express app setup
│   └── server.js           # Entry point
├── frontend/               # React + Tailwind CSS
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── services/       # API calls
│   │   ├── App.jsx         # Root component
│   │   └── main.jsx        # Entry point
│   └── public/             # Static assets
└── README.md
\`\`\`

## 🎯 API Endpoints

### Itineraries
- `GET /api/itineraries` - Get all itineraries (with search/filter)
- `GET /api/itineraries/:id` - Get single itinerary
- `POST /api/itineraries` - Create new itinerary
- `PUT /api/itineraries/:id` - Update itinerary
- `DELETE /api/itineraries/:id` - Delete itinerary

### Recommendations
- `GET /api/recommendations` - Get recommended itineraries
- `GET /api/recommendations/destinations` - Get popular destinations
- `GET /api/recommendations/similar/:id` - Get similar itineraries

### Health Check
- `GET /api/health` - API health status

## 🎨 Design Features

### Color Palette
- **Primary**: Green (#15803d) - Represents nature and travel
- **Secondary**: Lime (#84cc16) - Accent color for interactions
- **Neutrals**: White, light greens, and grays for clean aesthetics

### Typography
- **Headings**: Playfair Display (elegant, trustworthy)
- **Body**: Source Sans Pro (readable, modern)

### UI Components
- Professional navigation with active states
- Interactive cards with hover effects
- Comprehensive forms with validation
- Loading states and error handling
- Responsive grid layouts

## 📊 Sample Data

The application comes with pre-seeded data including:

### Phuket Itineraries
- **3-Day Beach Paradise** - Budget-friendly beach experience
- **5-Day Luxury Escape** - Premium resort and dining experiences
- **7-Day Adventure Week** - Action-packed activities and sports

### Krabi Itineraries
- **4-Day Island Hopping** - Explore limestone karsts and beaches
- **6-Day Romantic Honeymoon** - Couples-focused luxury experience

All itineraries include:
- Detailed day-by-day activities
- Hotel recommendations with ratings
- Activity descriptions and timings
- Budget estimates and best travel times
- Relevant tags (beach, adventure, luxury, etc.)

## 🔧 Development

### Available Scripts

**Backend:**
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run seed` - Populate database with sample data

**Frontend:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Environment Variables

**Backend (.env):**
\`\`\`env
MONGO_URI=your_mongodb_connection_string
PORT=5000
NODE_ENV=development
\`\`\`

**Frontend (.env):**
\`\`\`env
VITE_API_URL=http://localhost:5000/api
\`\`\`

## 🚀 Deployment

### Backend Deployment (Render/Railway/Vercel)
1. Connect your GitHub repository
2. Set environment variables
3. Deploy with automatic builds

### Frontend Deployment (Vercel/Netlify)
1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Deploy with automatic builds

### Database (MongoDB Atlas)
1. Create a MongoDB Atlas cluster
2. Configure network access
3. Get connection string for MONGO_URI

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Design inspiration from modern travel platforms
- Icons from Lucide React
- Fonts from Google Fonts
- Sample destination data for Phuket and Krabi, Thailand

---

**Built with ❤️ for travelers who love to plan their perfect adventures!**
