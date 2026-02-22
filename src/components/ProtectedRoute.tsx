import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: "admin" | "organizer";
}

export const ProtectedRoute = ({ children, allowedRole }: ProtectedRouteProps) => {
  const [status, setStatus] = useState<"loading" | "ok" | "fail">("loading");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("baazigar_session");

      if (!raw) {
        setStatus("fail");
        return;
      }

      const session = JSON.parse(raw);

      if (!session?.id || !session?.role) {
        localStorage.removeItem("baazigar_session");
        setStatus("fail");
        return;
      }

      // 🔐 Role check
      if (allowedRole && session.role !== allowedRole) {
        setStatus("fail");
        return;
      }

      setStatus("ok");
    } catch {
      localStorage.removeItem("baazigar_session");
      setStatus("fail");
    }
  }, [allowedRole]);

  if (status === "loading") {
    return (
      <div className="h-screen flex items-center justify-center text-sm">
        Checking session...
      </div>
    );
  }

  if (status === "fail") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};