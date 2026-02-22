import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: "admin" | "organizer" | "scanner";
}

export const ProtectedRoute = ({
  children,
  allowedRole,
}: ProtectedRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // 🔐 Get real session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      // 🔐 Fetch role from DB (never trust localStorage)
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (error || !data) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      // 🔐 Role check
      if (allowedRole && data.role !== allowedRole) {
        setAuthorized(false);
      } else {
        setAuthorized(true);
      }

      setLoading(false);
    };

    checkAuth();
  }, [allowedRole]);

  if (loading) return null;

  if (!authorized) return <Navigate to="/login" replace />;

  return <>{children}</>;
};