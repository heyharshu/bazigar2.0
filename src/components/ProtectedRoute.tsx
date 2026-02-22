import { Navigate, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[]; // roles allowed for this route (optional)
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const location = useLocation();

  try {
    const raw = localStorage.getItem("baazigar_user");

    // ❌ No session → go login
    if (!raw) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const user = JSON.parse(raw);

    // ❌ Invalid session → clear + login
    if (!user || !user.role) {
      localStorage.removeItem("baazigar_user");
      return <Navigate to="/login" replace />;
    }

    // ❌ Role not allowed → block access
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return <Navigate to="/login" replace />;
    }

    // ✅ Valid session → allow route
    return <>{children}</>;
  } catch (error) {
    // ❌ Corrupted storage → reset session
    localStorage.removeItem("baazigar_user");
    return <Navigate to="/login" replace />;
  }
};