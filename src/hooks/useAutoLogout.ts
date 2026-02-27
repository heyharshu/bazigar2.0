import { useEffect } from "react";

export const useAutoLogout = (timeout: number) => {
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const logout = () => {
      // ✅ clear EVERYTHING
      localStorage.clear();
      sessionStorage.clear();

      // optional: remove supabase auth if used
      try {
        localStorage.removeItem("supabase.auth.token");
      } catch {}

      window.location.href = "/login";
    };

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(logout, timeout);
    };

    // activity listeners
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("click", resetTimer);
    window.addEventListener("scroll", resetTimer);

    resetTimer();

    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("click", resetTimer);
      window.removeEventListener("scroll", resetTimer);
    };
  }, [timeout]);
};