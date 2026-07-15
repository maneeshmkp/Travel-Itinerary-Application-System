import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import ProtectedRoute from "./ProtectedRoute"
import {
  canAccessAdminPortal,
  hasAnyPermission,
  isSuperAdmin,
} from "../utils/rbac"

/**
 * Guards /admin/* — Admin / staff only.
 * Super Admins are redirected to the matching /super-admin path.
 */
export default function AdminRoute({ children, permission, permissions = [] }) {
  const { user } = useAuth()
  const location = useLocation()
  const needed = [...(permission ? [permission] : []), ...permissions]

  if (isSuperAdmin(user)) {
    const next = location.pathname.replace(/^\/admin/, "/super-admin") || "/super-admin"
    return <Navigate to={`${next}${location.search}`} replace />
  }

  return (
    <ProtectedRoute>
      {!canAccessAdminPortal(user) ? (
        <Navigate to="/" replace state={{ message: "Admin access required" }} />
      ) : needed.length && !hasAnyPermission(user, needed) ? (
        <Navigate to="/admin" replace state={{ message: "Insufficient permissions" }} />
      ) : (
        children
      )}
    </ProtectedRoute>
  )
}
