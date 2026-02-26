import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StatsCards } from "@/components/admin/StatsCards";
import { ParticipantsTable } from "@/components/admin/ParticipantsTable";
import { GameManagement } from "@/components/admin/GameManagement";
import { RechargeModal } from "@/components/admin/RechargeModal";
import { SpotRegistration } from "@/components/admin/SpotRegistration";
import { Gamepad2, LogOut, RefreshCw } from "lucide-react";
import { useAutoLogout } from "@/hooks/useAutoLogout";

const Admin = () => {
  useAutoLogout(20 * 60 * 1000);
  const navigate = useNavigate();

  const [participants, setParticipants] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [scannerLocked, setScannerLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState<string | null>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("baazigar_user") || "null");
    if (!user) return navigate("/login");
    if (user.role !== "admin") return navigate("/scanner");

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [pRes, gRes, tRes, lockRes] = await Promise.all([
        supabase.from("participants").select("*"),
        supabase.from("games").select("*"),
        supabase.from("transactions").select("*").limit(50),
        supabase
          .from("event_settings")
          .select("scanner_locked, locked_by")
          .single(),
      ]);

      if (pRes.data) setParticipants(pRes.data);
      if (gRes.data) setGames(gRes.data);
      if (tRes.data) setTransactions(tRes.data);
      if (lockRes.data) {
        setScannerLocked(lockRes.data.scanner_locked);
        setLockedBy(lockRes.data.locked_by);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleScannerLock = async () => {
    const user = JSON.parse(localStorage.getItem("baazigar_user") || "null");
    if (!user) return;

    const confirmAction = confirm(
      scannerLocked
        ? "Resume Scanner?"
        : "Stop Scanner from deducting points?"
    );

    if (!confirmAction) return;

    const { error } = await supabase
      .from("event_settings")
      .update({
        scanner_locked: !scannerLocked,
        locked_by: !scannerLocked ? user.username : null,
      })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (!error) fetchData();
  };

  const handleLogout = () => {
    localStorage.removeItem("baazigar_user");
    window.location.href = "/login";
  };

  const filteredParticipants = useMemo(() => {
    return participants.filter((p) =>
      `${p.name} ${p.reg_no}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [participants, search]);

  const totalPoints = participants.reduce(
    (sum, p) => sum + (p.points || 0),
    0
  );

  const topPlayer = participants.reduce(
    (max, p) => (p.points > (max?.points || 0) ? p : max),
    null
  );

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading Admin Dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-primary">
              BAAZIGAR 2.0
            </h1>
            <span className="text-xs bg-primary/10 px-2 py-1 rounded">
              ADMIN
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={toggleScannerLock}
              variant={scannerLocked ? "destructive" : "default"}
            >
              {scannerLocked ? "Resume Scanner" : "Stop Scanner"}
            </Button>

            <Button variant="ghost" size="icon" onClick={fetchData}>
              <RefreshCw className="w-4 h-4" />
            </Button>

            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Scanner Lock Banner */}
      {scannerLocked && (
        <div className="bg-red-600 text-white text-center py-2 font-semibold">
          🔒 Scanner Disabled — Locked by {lockedBy}
        </div>
      )}

      <main className="container mx-auto px-4 py-6 space-y-6">

        <div className="bg-card border rounded-2xl p-4 shadow-sm">
          <StatsCards
            totalParticipants={participants.length}
            totalPoints={totalPoints}
            totalTransactions={
              transactions.filter((tx) => tx.type === "deduction").length
            }
          />
        </div>

        <div className="bg-card border rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold mb-3">🏆 Leaderboard</h2>

          <div className="space-y-2 max-h-60 overflow-auto">
            {[...participants]
              .sort((a, b) => b.points - a.points)
              .slice(0, 10)
              .map((p, i) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center bg-muted/40 px-3 py-2 rounded-lg"
                >
                  <div className="flex gap-3">
                    <span className="w-6 text-sm font-mono">
                      #{i + 1}
                    </span>
                    <span>{p.name}</span>
                  </div>
                  <span className="font-bold text-primary">
                    {p.points} pts
                  </span>
                </div>
              ))}
          </div>

          {topPlayer && (
            <div className="mt-3 bg-green-500/10 border border-green-400 rounded-xl p-3">
              🏆 Current Leader: <b>{topPlayer.name}</b> —{" "}
              {topPlayer.points} pts
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3 bg-card border rounded-2xl shadow-sm">
            <div className="p-4 border-b font-semibold">
              Participants
            </div>

            <div className="p-4 overflow-auto max-h-[65vh]">
              <ParticipantsTable
                participants={filteredParticipants}
                search={search}
                onSearchChange={setSearch}
                onRefresh={fetchData}
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card border rounded-2xl p-4 shadow-sm">
              <h2 className="font-semibold mb-3">
                Spot Registration
              </h2>
              <SpotRegistration onRegistered={fetchData} />
            </div>

            <div className="bg-card border rounded-2xl p-4 shadow-sm">
              <h2 className="font-semibold mb-3">
                Game Management
              </h2>
              <GameManagement games={games} onUpdated={fetchData} />
            </div>

            <div className="bg-card border rounded-2xl p-4 shadow-sm">
              <h2 className="font-semibold mb-3">
                Recharge / Deduct
              </h2>
              <RechargeModal
                participants={participants}
                onRecharged={fetchData}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Admin;