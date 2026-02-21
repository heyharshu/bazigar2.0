import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  try {
    const raw = localStorage.getItem("baazigar_user");

    if (!raw) {
      console.log("No session → redirect login");
      return <Navigate to="/login" replace />;
    }

    const user = JSON.parse(raw);

    if (!user || !user.role) {
      console.log("Invalid session → redirect login");
      localStorage.removeItem("baazigar_user");
      return <Navigate to="/login" replace />;
    }

    // ✅ session valid → allow access
    return <>{children}</>;

  } catch (err) {
    console.log("Session error → redirect login");
    localStorage.removeItem("baazigar_user");
    return <Navigate to="/login" replace />;
  }
};