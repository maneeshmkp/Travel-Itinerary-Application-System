import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { authAPI } from "../services/api"

const TOKEN_KEY = "token"
const USER_KEY = "user"

const AuthContext = createContext(null)

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(readStoredUser)

  useEffect(() => {
    const legacy = localStorage.getItem("authToken")
    if (legacy && !localStorage.getItem(TOKEN_KEY)) {
      localStorage.setItem(TOKEN_KEY, legacy)
      localStorage.removeItem("authToken")
      setToken(legacy)
    }
  }, [])

  const persistSession = useCallback((nextToken, nextUser) => {
    if (nextToken) localStorage.setItem(TOKEN_KEY, nextToken)
    else localStorage.removeItem(TOKEN_KEY)
    if (nextUser) localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    else localStorage.removeItem(USER_KEY)
    setToken(nextToken)
    setUser(nextUser)
  }, [])

  const login = useCallback(
    async ({ email, password }) => {
      const response = await authAPI.login({ email, password })
      const data = response.data
      if (!data?.success || !data.token) {
        throw new Error(data?.message || "Login failed")
      }
      persistSession(data.token, data.user ?? null)
      return data
    },
    [persistSession],
  )

  const signup = useCallback(
    async (payload) => {
      const response = await authAPI.signup(payload)
      const data = response.data
      if (!data?.success || !data.token) {
        throw new Error(data?.message || "Sign up failed")
      }
      persistSession(data.token, data.user ?? null)
      return data
    },
    [persistSession],
  )

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem("authToken")
    setToken(null)
    setUser(null)
    navigate("/", { replace: true })
  }, [navigate])

  const isAuthenticated = !!token

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated,
      login,
      signup,
      logout,
      setUser: (next) => {
        setUser(next)
        if (next) localStorage.setItem(USER_KEY, JSON.stringify(next))
        else localStorage.removeItem(USER_KEY)
      },
    }),
    [token, user, isAuthenticated, login, signup, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return ctx
}

export { TOKEN_KEY, USER_KEY }
