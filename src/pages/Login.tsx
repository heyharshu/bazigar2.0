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
      // 🔎 Fetch user by username
      const { data, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("username", username.trim())
        .limit(1);

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("Invalid username or password");
      }

      const user = data[0];

      // 🔐 Manual password check
      if (user.password !== password) {
        throw new Error("Invalid username or password");
      }

      // 💾 Save session locally
      localStorage.setItem("baazigar_user", JSON.stringify(user));
      console.log("LOGIN SUCCESS →", user);

      // 📱 Small delay helps mobile routing
      await new Promise((r) => setTimeout(r, 80));

      toast({
        title: "Login successful",
        description: `Welcome ${user.role}`,
      });

      // 🚀 Redirect safely
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Gamepad2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold font-mono text-primary">
            BAAZIGAR
          </h1>
          <p className="text-muted-foreground">QR Points System</p>
        </div>

        {/* Login Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <form onSubmit={handleLogin} className="space-y-4">

            {/* Username */}
            <div>
              <Label>Username</Label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
              />
            </div>

            {/* Password */}
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground"
            >
              {loading ? "Logging in..." : "Login"}
            </Button>

          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;