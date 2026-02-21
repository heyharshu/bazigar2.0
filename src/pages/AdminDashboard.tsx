import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatsCards } from "@/components/admin/StatsCards";

interface Stats {
  totalParticipants: number;
  totalPoints: number;
  totalGameTransactions: number;
  totalRechargeTransactions: number;
  totalRevenue: number;
  mostPlayedGame: string;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalParticipants: 0,
    totalPoints: 0,
    totalGameTransactions: 0,
    totalRechargeTransactions: 0,
    totalRevenue: 0,
    mostPlayedGame: "",
  });

  const loadStats = async () => {
    try {
      /* ================= PARTICIPANTS COUNT ================= */
      const { count: participantsCount, error: pErr } = await supabase
        .from("participants")
        .select("*", { count: "exact", head: true });

      if (pErr) throw pErr;

      /* ================= TOTAL POINTS ================= */
      const { data: pointsData, error: ptErr } = await supabase
        .from("participants")
        .select("points");

      if (ptErr) throw ptErr;

      const totalPoints =
        pointsData?.reduce(
          (sum, p) => sum + Number(p.points || 0),
          0
        ) || 0;

      /* ================= GAME PLAYS COUNT ================= */
      const { count: gameCount, error: gErr } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("type", "deduction");

      if (gErr) throw gErr;

      /* ================= RECHARGE COUNT ================= */
      const { count: rechargeCount, error: rErr } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("type", "recharge");

      if (rErr) throw rErr;

      /* ================= TOTAL REVENUE ================= */
      const { data: rechargeData, error: revErr } = await supabase
        .from("transactions")
        .select("points_change")
        .eq("type", "recharge");

      if (revErr) throw revErr;

      const totalRevenue =
        rechargeData?.reduce(
          (sum, r) => sum + Number(r.points_change || 0),
          0
        ) || 0;

      /* ================= MOST PLAYED GAME ================= */
      const { data: gamesData, error: mErr } = await supabase
        .from("transactions")
        .select("game_name")
        .eq("type", "deduction");

      if (mErr) throw mErr;

      const gameCountMap: Record<string, number> = {};

      gamesData?.forEach((g) => {
        if (!g.game_name) return;
        gameCountMap[g.game_name] =
          (gameCountMap[g.game_name] || 0) + 1;
      });

      let mostPlayedGame = "";
      let max = 0;

      Object.entries(gameCountMap).forEach(([game, count]) => {
        if (count > max) {
          max = count;
          mostPlayedGame = game;
        }
      });

      /* ================= SET STATE ================= */
      setStats({
        totalParticipants: Number(participantsCount || 0),
        totalPoints,
        totalGameTransactions: Number(gameCount || 0),
        totalRechargeTransactions: Number(rechargeCount || 0),
        totalRevenue,
        mostPlayedGame,
      });

    } catch (err) {
      console.error("Dashboard load error:", err);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <h1 className="text-2xl font-bold font-mono text-primary">
        Admin Dashboard
      </h1>

      <StatsCards
        totalParticipants={stats.totalParticipants}
        totalPoints={stats.totalPoints}
        totalGameTransactions={stats.totalGameTransactions}
        totalRechargeTransactions={stats.totalRechargeTransactions}
        totalRevenue={stats.totalRevenue}
        mostPlayedGame={stats.mostPlayedGame}
      />
    </div>
  );
};

export default AdminDashboard;