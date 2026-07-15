import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import ProtectedRoute from "./ProtectedRoute"
import { isSuperAdmin } from "../utils/rbac"

/**
 * Guards /super-admin/* — Super Admin only.
 * Admins / staff are sent to the matching /admin path.
 */
export default function SuperAdminRoute({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  const adminPath =
    (location.pathname.replace(/^\/super-admin/, "/admin") || "/admin") + location.search

  return (
    <ProtectedRoute>
      {!isSuperAdmin(user) ? (
        <Navigate to={adminPath} replace state={{ message: "Super Admin access required" }} />
      ) : (
        children
      )}
    </ProtectedRoute>
  )
}
