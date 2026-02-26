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
import { logAdminAction } from "@/utils/adminLog";

const Admin = () => {
  useAutoLogout(20 * 60 * 1000);
  const navigate = useNavigate();

  const [participants, setParticipants] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [eventLocked, setEventLocked] = useState(false);

  // 🔐 Protect route + auto refresh
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("baazigar_user") || "null");
    if (!user) return navigate("/login");
    if (user.role !== "admin") return navigate("/scanner");

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // 🚀 Fetch data
  const fetchData = async () => {
    try {
      const [pRes, gRes, tRes, lockRes] = await Promise.all([
        supabase.from("participants").select("*"),
        supabase.from("games").select("*"),
        supabase.from("transactions").select("*").limit(50),
        supabase.from("event_settings").select("event_locked").single(),
      ]);

      if (pRes.data) setParticipants(pRes.data);
      if (gRes.data) setGames(gRes.data);
      if (tRes.data) setTransactions(tRes.data);
      if (lockRes.data) setEventLocked(lockRes.data.event_locked);
    } catch (err) {
      console.error("Fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  // 🔒 Toggle Event Lock + log
  const toggleEventLock = async () => {
    const confirmAction = confirm(
      eventLocked
        ? "Unlock event? All operations resume."
        : "LOCK EVENT? Points freeze & scanner stops."
    );
    if (!confirmAction) return;

    const { error } = await supabase
      .from("event_settings")
      .update({ event_locked: !eventLocked })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (!error) {
      setEventLocked(!eventLocked);
      await logAdminAction(eventLocked ? "EVENT_UNLOCKED" : "EVENT_LOCKED");
    }
  };

  // 🔓 Logout
  const handleLogout = () => {
    localStorage.removeItem("baazigar_user");
    window.location.href = "/login";
  };

  // 🔎 Instant Search
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) =>
      `${p.name} ${p.reg_no}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [participants, search]);

  // 📊 Stats
  const totalPoints = participants.reduce(
    (sum, p) => sum + (p.points || 0),
    0
  );

  // 🏆 Current Winner
  const topPlayer = participants.reduce(
    (max, p) => (p.points > (max?.points || 0) ? p : max),
    null
  );

  // ⚠️ Suspicious
  const suspicious = transactions.filter(
    (t) => t.amount > 500 || t.amount < -500
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
            <h1 className="text-xl font-bold text-primary">BAAZIGAR 2.0</h1>
            <span className="text-xs bg-primary/10 px-2 py-1 rounded">
              ADMIN PRO
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={toggleEventLock}
              variant={eventLocked ? "destructive" : "default"}
            >
              {eventLocked ? "Unlock Event" : "Lock Event"}
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

      {/* LOCK Banner */}
      {eventLocked && (
        <div className="bg-red-600 text-white text-center py-2 font-semibold">
          🔒 EVENT LOCKED — Scanner & Actions Disabled
        </div>
      )}

      <main className="container mx-auto px-4 py-6 space-y-6">

        {/* Stats */}
        <div className="bg-card border rounded-2xl p-4 shadow-sm">
          <StatsCards
            totalParticipants={participants.length}
            totalPoints={totalPoints}
            totalTransactions={
              transactions.filter((tx) => tx.type === "deduction").length
            }
          />
        </div>

        {/* Leaderboard */}
        <div className="bg-card border rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold mb-3">🏆 Live Leaderboard</h2>

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
                    <span className="w-6 text-sm font-mono">#{i + 1}</span>
                    <span>{p.name}</span>
                  </div>
                  <span className="font-bold text-primary">{p.points} pts</span>
                </div>
              ))}
          </div>

          {topPlayer && (
            <div className="mt-3 bg-green-500/10 border border-green-400 rounded-xl p-3">
              🏆 Winner: <b>{topPlayer.name}</b> — {topPlayer.points} pts
            </div>
          )}
        </div>

        {/* Suspicious */}
        {suspicious.length > 0 && (
          <div className="bg-red-500/10 border border-red-400 p-3 rounded-xl">
            ⚠️ Suspicious Transactions: {suspicious.length}
          </div>
        )}

        {/* Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

          {/* Participants */}
          <div className="xl:col-span-3 bg-card border rounded-2xl shadow-sm">
            <div className="p-4 border-b font-semibold">Participants</div>
            <div className="p-4 overflow-auto max-h-[65vh]">
              <ParticipantsTable
                participants={filteredParticipants}
                search={search}
                onSearchChange={setSearch}
                onRefresh={fetchData}
              />
            </div>
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            <div className="bg-card border rounded-2xl p-4 shadow-sm">
              <h2 className="font-semibold mb-3">Spot Registration</h2>
              <SpotRegistration disabled={eventLocked} onRegistered={fetchData} />
            </div>

            <div className="bg-card border rounded-2xl p-4 shadow-sm">
              <h2 className="font-semibold mb-3">Game Management</h2>
              <GameManagement disabled={eventLocked} games={games} onUpdated={fetchData} />
            </div>

            <div className="bg-card border rounded-2xl p-4 shadow-sm">
              <h2 className="font-semibold mb-3">Recharge / Deduct</h2>
              <RechargeModal
                disabled={eventLocked}
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