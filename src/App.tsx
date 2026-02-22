import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { ProtectedRoute } from "@/components/ProtectedRoute";

import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Scanner from "./pages/Scanner";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  /*
  🔥 Warm Edge Function every 5 min
  Prevents cold start → faster email send
  */
  useEffect(() => {
    const warm = () => {
      fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-qr-email`,
        { method: "OPTIONS" }
      ).catch(() => {});
    };

    warm(); // run once immediately
    const interval = setInterval(warm, 300000); // every 5 min

    return () => clearInterval(interval);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />

        <BrowserRouter>
          <Routes>
            {/* Redirect root */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Login */}
            <Route path="/login" element={<Login />} />

            {/* Admin Panel */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute role="admin">
                  <Admin />
                </ProtectedRoute>
              }
            />

            {/* Scanner */}
            <Route
              path="/scanner"
              element={
                <ProtectedRoute role="scanner">
                  <Scanner />
                </ProtectedRoute>
              }
            />

            {/* Not Found */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;