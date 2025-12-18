# Travel Itinerary Backend - Setup Guide

## Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- MongoDB Atlas account (already configured)

## Installation Steps

### 1. Install Dependencies

Navigate to the backend folder and install all required packages:

```bash
cd backend
npm install
```

This will install:
- `express` - Web framework
- `mongoose` - MongoDB ORM
- `cors` - Cross-origin requests
- `dotenv` - Environment variables
- `express-validator` - Input validation
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT authentication
- `nodemon` - Auto-restart on file changes (dev)

### 2. Verify Environment Variables

Check your `.env` file has these variables:

```env
PORT=8000
MONGO_URI=mongodb+srv://12212016it_db_user:4Ol0HgTVRxt7K8CZ@cluster0.6ov0taa.mongodb.net
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-in-production
FRONTEND_URL=http://localhost:5173
```

### 3. Run the Backend Server

#### Development Mode (with auto-reload):
```bash
npm run dev
```

#### Production Mode:
```bash
npm start
```

The server will start on `http://localhost:8000`

## Available Endpoints

### Authentication Routes
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password/:resetToken` - Reset password
- `GET /api/auth/me` - Get current user (requires token)

### Itinerary Routes
- `GET /api/itineraries` - Get all itineraries
- `GET /api/itineraries/:id` - Get single itinerary
- `POST /api/itineraries` - Create itinerary
- `PUT /api/itineraries/:id` - Update itinerary
- `DELETE /api/itineraries/:id` - Delete itinerary

### Recommendation Routes
- `GET /api/recommendations` - Get recommendations
- `GET /api/recommendations/destinations` - Get all destinations
- `GET /api/recommendations/similar/:id` - Get similar itineraries

### Health Check
- `GET /api/health` - Check API status

## Troubleshooting

### Issue: "Cannot find module" error

**Solution:** Make sure all dependencies are installed:
```bash
npm install
```

### Issue: MongoDB Connection Error

**Solution:** Check your MONGO_URI in .env file:
```
MONGO_URI=mongodb+srv://12212016it_db_user:4Ol0HgTVRxt7K8CZ@cluster0.6ov0taa.mongodb.net
```

Make sure:
- Username and password are correct
- IP address is whitelisted in MongoDB Atlas
- Database name is included in the URI

### Issue: Port Already in Use

**Solution:** Change the PORT in .env file or kill the process using port 8000:

**Windows:**
```bash
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

**Mac/Linux:**
```bash
lsof -i :8000
kill -9 <PID>
```

### Issue: CORS Errors in Frontend

**Solution:** Make sure your frontend URL is in the CORS configuration:
- Frontend running on `http://localhost:5173`
- Backend has it configured in `app.js`

## Testing the API

### Using cURL

#### Signup:
```bash
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"password123","confirmPassword":"password123"}'
```

#### Login:
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'
```

#### Forgot Password:
```bash
curl -X POST http://localhost:8000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com"}'
```

### Using Postman

1. Import the API endpoints into Postman
2. Set the base URL to `http://localhost:8000/api`
3. Test each endpoint with sample data

## Database

The backend uses MongoDB Atlas (cloud database):
- **Cluster**: cluster0.6ov0taa.mongodb.net
- **Username**: 12212016it_db_user
- **Collections**: Users, Itineraries, Days, Activities

Data is automatically created when you:
- Sign up (creates User)
- Create itinerary (creates Itinerary, Days, Activities)

## Security Notes

⚠️ **Important for Production:**
1. Change `JWT_SECRET` to a strong random string
2. Never commit `.env` file to git (already in .gitignore)
3. Use environment variables from your deployment platform
4. Enable HTTPS in production
5. Add rate limiting to prevent abuse
6. Implement email verification for signup
7. Add password reset email functionality

## Next Steps

1. ✅ Install dependencies
2. ✅ Verify .env configuration
3. ✅ Run backend with `npm run dev`
4. ✅ Test endpoints with Postman or cURL
5. ✅ Connect frontend to backend
6. ✅ Deploy to production

## Support

If you encounter issues:
1. Check the console for error messages
2. Verify all environment variables are set
3. Test MongoDB connection
4. Check CORS configuration
5. Review API endpoint URLs
