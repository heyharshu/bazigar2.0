import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatsCards } from "@/components/admin/StatsCards";
import { ExcelUpload } from "@/components/admin/ExcelUpload";
import { ParticipantsTable } from "@/components/admin/ParticipantsTable";
import { GameManagement } from "@/components/admin/GameManagement";
import { RechargeModal } from "@/components/admin/RechargeModal";
import { SpotRegistration } from "@/components/admin/SpotRegistration";
import { Gamepad2, LogOut, RefreshCw } from "lucide-react";

const Admin = () => {
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [pRes, gRes, tRes] = await Promise.all([
      supabase.from("participants").select("*").order("name"),
      supabase.from("games").select("*").order("name"),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    if (pRes.data) setParticipants(pRes.data);
    if (gRes.data) setGames(gRes.data);
    if (tRes.data) setTransactions(tRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const totalPoints = participants.reduce((sum, p) => sum + p.points, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-mono font-bold text-primary text-glow-cyan">BAAZIGAR</h1>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md font-mono">ADMIN</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={fetchData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <StatsCards
          totalParticipants={participants.length}
          totalPoints={totalPoints}
          totalTransactions={transactions.length}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ExcelUpload onImported={fetchData} />
            <ParticipantsTable
              participants={participants}
              search={search}
              onSearchChange={setSearch}
              onRefresh={fetchData}
            />
          </div>
          <div className="space-y-6">
            <SpotRegistration onRegistered={fetchData} />
            <GameManagement games={games} onUpdated={fetchData} />
            <RechargeModal participants={participants} onRecharged={fetchData} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Admin;
