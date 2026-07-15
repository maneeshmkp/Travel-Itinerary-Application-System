/**
 * Tab-scoped auth storage (+ refresh token for session rotation).
 */
const TOKEN_KEY = "token"
const REFRESH_KEY = "refreshToken"
const USER_KEY = "user"
const DEVICE_KEY = "deviceId"
const LEGACY_TOKEN = "authToken"

function store() {
  return typeof sessionStorage !== "undefined" ? sessionStorage : null
}

function migrateFromLocalStorage() {
  if (typeof localStorage === "undefined" || typeof sessionStorage === "undefined") return
  try {
    if (!sessionStorage.getItem(TOKEN_KEY)) {
      const legacy =
        localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN)
      if (legacy) sessionStorage.setItem(TOKEN_KEY, legacy)
    }
    if (!sessionStorage.getItem(USER_KEY)) {
      const u = localStorage.getItem(USER_KEY)
      if (u) sessionStorage.setItem(USER_KEY, u)
    }
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(LEGACY_TOKEN)
    localStorage.removeItem(REFRESH_KEY)
  } catch {
    /* private mode / quota */
  }
}

export function getOrCreateDeviceId() {
  const s = store()
  if (!s) return null
  let id = s.getItem(DEVICE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    s.setItem(DEVICE_KEY, id)
  }
  return id
}

export function getAuthToken() {
  migrateFromLocalStorage()
  const s = store()
  if (!s) return null
  return s.getItem(TOKEN_KEY) || s.getItem(LEGACY_TOKEN)
}

export function setAuthToken(token) {
  const s = store()
  if (!s) return
  if (token) s.setItem(TOKEN_KEY, token)
  else {
    s.removeItem(TOKEN_KEY)
    s.removeItem(LEGACY_TOKEN)
  }
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(LEGACY_TOKEN)
  } catch {
    /* ignore */
  }
}

export function getRefreshToken() {
  migrateFromLocalStorage()
  return store()?.getItem(REFRESH_KEY) || null
}

export function setRefreshToken(token) {
  const s = store()
  if (!s) return
  if (token) s.setItem(REFRESH_KEY, token)
  else s.removeItem(REFRESH_KEY)
}

export function getAuthUser() {
  migrateFromLocalStorage()
  const s = store()
  if (!s) return null
  try {
    const raw = s.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setAuthUser(user) {
  const s = store()
  if (!s) return
  if (user) s.setItem(USER_KEY, JSON.stringify(user))
  else s.removeItem(USER_KEY)
  try {
    localStorage.removeItem(USER_KEY)
  } catch {
    /* ignore */
  }
}

export function clearAuthStorage() {
  const s = store()
  if (s) {
    s.removeItem(TOKEN_KEY)
    s.removeItem(USER_KEY)
    s.removeItem(LEGACY_TOKEN)
    s.removeItem(REFRESH_KEY)
    // keep DEVICE_KEY stable across logout
  }
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(LEGACY_TOKEN)
    localStorage.removeItem(REFRESH_KEY)
  } catch {
    /* ignore */
  }
}

export function persistAuthSession(token, user, refreshToken = undefined) {
  setAuthToken(token)
  setAuthUser(user ?? null)
  if (refreshToken !== undefined) setRefreshToken(refreshToken)
}

export { TOKEN_KEY, USER_KEY, REFRESH_KEY }
