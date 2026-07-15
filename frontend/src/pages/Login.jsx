import { useState } from "react"
import { useNavigate, useLocation, Link, useSearchParams } from "react-router-dom"
import { Mail, Lock, Eye, EyeOff } from "lucide-react"
import { useToast } from "../hooks/useToast"
import { useAuth } from "../context/AuthContext"

const Login = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()
  const { showSuccess, showError } = useToast()

  const redirectMessage =
    location.state?.message ||
    (searchParams.get("session") === "expired" ? "Your session expired. Please sign in again." : "")
  const returnPath = searchParams.get("from")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    // Validation
    if (!email || !password) {
      setError("Please fill in all fields")
      return
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address")
      return
    }

    setIsLoading(true)

    try {
      await login({ email, password })
      showSuccess("Login successful!")
      const from = location.state?.from
      if (from?.pathname) {
        navigate(`${from.pathname}${from.search || ""}`, {
          replace: true,
          state: from.state,
        })
      } else if (returnPath && returnPath.startsWith("/")) {
        navigate(returnPath, { replace: true })
      } else {
        navigate("/", { replace: true })
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Login failed. Please try again."
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="form-page flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your account to continue</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="form-card space-y-5">
          {redirectMessage && (
            <div className="bg-blue-50 border border-blue-100 text-gray-800 px-4 py-3 rounded-lg text-sm">
              {redirectMessage}
            </div>
          )}
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-1">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400 pointer-events-none" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="form-input pl-10"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400 pointer-events-none" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="form-input pl-10 pr-11"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Sign Up Link */}
        <p className="text-center text-gray-600 mt-6 text-sm">
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary hover:text-primary/90 font-semibold">
            Create one now
          </Link>
        </p>

        {/* Forgot Password Link */}
        <p className="text-center text-gray-600 mt-2 text-sm">
          <Link
            to="/forgot-password"
            className="text-primary hover:text-primary/90 font-semibold transition-colors"
          >
            Forgot your password?
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login
