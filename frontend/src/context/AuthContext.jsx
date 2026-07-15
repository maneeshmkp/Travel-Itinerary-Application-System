import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { authAPI } from "../services/api"
import {
  clearAuthStorage,
  getAuthToken,
  getAuthUser,
  getOrCreateDeviceId,
  persistAuthSession,
  setAuthUser,
} from "../utils/authStorage"

const AuthContext = createContext(null)

function applyAuthPayload(data) {
  const access = data.accessToken || data.token
  persistAuthSession(access, data.user ?? null, data.refreshToken)
  return { token: access, user: data.user ?? null }
}

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [token, setToken] = useState(() => getAuthToken())
  const [user, setUser] = useState(() => getAuthUser())

  const persistSession = useCallback((nextToken, nextUser, refreshToken) => {
    persistAuthSession(nextToken, nextUser, refreshToken)
    setToken(nextToken)
    setUser(nextUser)
  }, [])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    authAPI
      .getCurrentUser()
      .then((res) => {
        if (cancelled) return
        const me = res.data?.user ?? res.data?.data?.user ?? res.data?.data
        if (me) {
          setUser(me)
          setAuthUser(me)
        }
      })
      .catch(() => {
        if (cancelled) return
        persistSession(null, null, null)
      })
    return () => {
      cancelled = true
    }
  }, [token, persistSession])

  const login = useCallback(
    async ({ email, password }) => {
      const response = await authAPI.login({
        email,
        password,
        deviceId: getOrCreateDeviceId(),
        deviceName: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 80) : "",
      })
      const data = response.data
      if (!data?.success || !(data.token || data.accessToken)) {
        throw new Error(data?.message || "Login failed")
      }
      const applied = applyAuthPayload(data)
      setToken(applied.token)
      setUser(applied.user)
      return data
    },
    [],
  )

  const signup = useCallback(async (payload) => {
    const response = await authAPI.signup({
      ...payload,
      deviceId: getOrCreateDeviceId(),
    })
    const data = response.data
    if (!data?.success || !(data.token || data.accessToken)) {
      throw new Error(data?.message || "Sign up failed")
    }
    const applied = applyAuthPayload(data)
    setToken(applied.token)
    setUser(applied.user)
    return data
  }, [])

  const logout = useCallback(async () => {
    try {
      await authAPI.logout()
    } catch {
      /* still clear local */
    }
    clearAuthStorage()
    setToken(null)
    setUser(null)
    navigate("/", { replace: true })
  }, [navigate])

  const logoutAll = useCallback(async () => {
    try {
      await authAPI.logoutAll()
    } catch {
      /* ignore */
    }
    clearAuthStorage()
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
      logoutAll,
      setUser: (next) => {
        setUser(next)
        setAuthUser(next)
      },
    }),
    [token, user, isAuthenticated, login, signup, logout, logoutAll],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
