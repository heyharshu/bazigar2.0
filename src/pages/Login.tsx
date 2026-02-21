import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Gamepad2 } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("username", username.trim())
        .limit(1);

      if (error) throw error;
      if (!data || data.length === 0)
        throw new Error("Invalid username or password");

      const user = data[0];

      if (user.password !== password)
        throw new Error("Invalid username or password");

      localStorage.setItem("baazigar_user", JSON.stringify(user));

      toast({
        title: "Login successful",
        description: `Welcome ${user.role}`,
      });

      if (user.role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/scanner", { replace: true });
      }
    } catch (err: any) {
      toast({
        title: "Login Failed",
        description: err.message || "Invalid login",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">

      {/* 🔥 Animated Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,#7c3aed,transparent_40%),radial-gradient(circle_at_80%_70%,#2563eb,transparent_40%)] animate-pulse" />

      {/* 🌫️ Soft Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* 💎 Login Card */}
      <div className="relative z-10 w-full max-w-md p-8 rounded-2xl 
      bg-white/10 backdrop-blur-xl border border-white/20 
      shadow-[0_0_40px_rgba(139,92,246,0.4)] transition-all duration-500">

        {/* 🎮 Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center 
          w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-600 to-blue-600 
          shadow-lg shadow-purple-500/40 mb-4 animate-bounce">
            <Gamepad2 className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-4xl font-extrabold tracking-wide 
          bg-gradient-to-r from-purple-400 to-blue-400 
          bg-clip-text text-transparent">
            BAAZIGAR 2.0
          </h1>

          <p className="text-gray-300 mt-2 text-sm">
            UX Club • VIT Bhopal
          </p>
        </div>

        {/* 📝 Form */}
        <form onSubmit={handleLogin} className="space-y-5">

          <div>
            <Label className="text-gray-300">Username</Label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              className="bg-white/10 border-white/20 text-white 
              focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <Label className="text-gray-300">Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="bg-white/10 border-white/20 text-white 
              focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-lg font-semibold 
            bg-gradient-to-r from-purple-600 to-blue-600 
            hover:scale-105 transition-transform duration-300 
            shadow-lg shadow-purple-500/40"
          >
            {loading ? "Logging in..." : "ENTER ARENA"}
          </Button>

        </form>
      </div>
    </div>
  );
};

export default Login;