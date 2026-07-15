import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Lock } from "lucide-react"
import { authAPI } from "../services/api"
import { persistAuthSession, getOrCreateDeviceId } from "../utils/authStorage"

export default function ResetPassword() {
  const { resetToken } = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!password || !confirmPassword) {
      setError("Please fill in both password fields")
      return
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    if (!resetToken) {
      setError("Invalid reset link")
      return
    }

    setIsLoading(true)
    try {
      const response = await authAPI.resetPassword(resetToken, {
        password,
        confirmPassword,
        deviceId: getOrCreateDeviceId(),
      })
      const data = response.data
      if (!data?.success || !(data.token || data.accessToken)) {
        throw new Error(data?.message || "Reset failed")
      }
      // Persist session the same way as login (tab-scoped)
      persistAuthSession(data.accessToken || data.token, data.user ?? null, data.refreshToken)
      navigate("/", { replace: true })
      window.location.reload()
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Reset failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="form-page flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-bold text-gray-900 mb-2">Set new password</h1>
          <p className="text-gray-600">Choose a new password for your account</p>
        </div>

        <form onSubmit={handleSubmit} className="form-card space-y-5">
          {error ? (
            <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
              {error}
            </div>
          ) : null}

          <div className="space-y-1">
            <label htmlFor="password" className="form-label">
              New password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400 pointer-events-none" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input pl-10"
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400 pointer-events-none" />
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-input pl-10"
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? "Saving..." : "Update password"}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/90 font-semibold transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
