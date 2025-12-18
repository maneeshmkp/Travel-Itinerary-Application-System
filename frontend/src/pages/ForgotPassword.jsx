import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Mail, ArrowLeft, CheckCircle, RotateCw } from "lucide-react"
import { useToast } from "../hooks/useToast"
import { authAPI } from "../services/api"

const ForgotPassword = () => {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()

  // Timer for resend button
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendTimer])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    // Validation
    if (!email) {
      setError("Please enter your email address")
      return
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address")
      return
    }

    setIsLoading(true)

    try {
      // Make API call to backend
      const response = await authAPI.forgotPassword({ email })

      if (response.data.success) {
        showSuccess(response.data.message || "Password reset link sent to your email!")
        setIsSubmitted(true)
        setResendTimer(60) // 60 second cooldown before resend
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to send reset link. Please try again."
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    const handleResendEmail = async () => {
      setIsLoading(true)
      try {
        // Make API call to resend
        const response = await authAPI.forgotPassword({ email })

        if (response.data.success) {
          showSuccess("Reset link resent! Check your email.")
          setResendTimer(60)
        }
      } catch (err) {
        showError(err.response?.data?.message || "Failed to resend. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Success Message */}
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>

            <h1 className="text-3xl font-heading font-bold text-foreground mb-4">Check Your Email</h1>
            <p className="text-muted-foreground mb-3 leading-relaxed">
              We've sent a password reset link to <span className="font-semibold text-foreground">{email}</span>.
            </p>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Click the link in the email to reset your password.
            </p>

            {/* Helpful Tips */}
            <div className="space-y-3 mb-8">
              <div className="bg-muted rounded-lg p-4 border border-border/50">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">💡 Tip:</span> Check your spam or promotions folder if you don't see the email.
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900/50">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <span className="font-semibold">📌 Note:</span> The reset link expires in 30 minutes for security.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setIsSubmitted(false)}
                className="w-full bg-secondary text-secondary-foreground py-2.5 rounded-lg font-semibold hover:bg-secondary/90 transition-colors"
              >
                Try Another Email
              </button>

              <button
                onClick={handleResendEmail}
                disabled={resendTimer > 0 || isLoading}
                className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCw className="h-4 w-4" />
                {isLoading ? "Resending..." : resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Email"}
              </button>

              <Link
                to="/login"
                className="w-full flex items-center justify-center gap-2 px-6 py-2.5 border-2 border-primary text-primary hover:bg-primary/5 rounded-lg font-semibold transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-bold text-foreground mb-2">Reset Password</h1>
          <p className="text-muted-foreground">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        {/* Reset Form */}
        <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border shadow-sm p-6 md:p-8 space-y-5">
          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-semibold text-foreground">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {isLoading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        {/* Back to Login Link */}
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

export default ForgotPassword
