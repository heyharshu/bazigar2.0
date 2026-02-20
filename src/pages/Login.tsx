import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Gamepad2, Shield, ScanLine } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "organizer">("admin");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast({ title: "Account created!", description: "You can now log in." });
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        localStorage.setItem("baazigar_role", role);
        navigate(role === "admin" ? "/admin" : "/scanner");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center retro-grid p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 glow-cyan mb-4">
            <Gamepad2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold font-mono text-glow-cyan text-primary">
            BAAZIGAR
          </h1>
          <p className="text-muted-foreground mt-1">QR Points System</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 glow-cyan">
          {/* Role Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setRole("admin")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-mono text-sm transition-all ${
                role === "admin"
                  ? "bg-primary text-primary-foreground glow-cyan"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <Shield className="w-4 h-4" />
              Admin
            </button>
            <button
              type="button"
              onClick={() => setRole("organizer")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-mono text-sm transition-all ${
                role === "organizer"
                  ? "bg-primary text-primary-foreground glow-cyan"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <ScanLine className="w-4 h-4" />
              Organizer
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@baazigar.com"
                required
                className="bg-secondary border-border mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-muted-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-secondary border-border mt-1"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan font-mono"
            >
              {loading ? "Loading..." : isSignUp ? "Create Account" : "Enter the Arena"}
            </Button>
          </form>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full text-center text-sm text-muted-foreground mt-4 hover:text-primary transition-colors"
          >
            {isSignUp ? "Already have an account? Log in" : "Need an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
