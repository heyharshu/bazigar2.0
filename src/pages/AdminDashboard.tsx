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
    // Participants count
    const { count: participantsCount } = await supabase
      .from("participants")
      .select("*", { count: "exact", head: true });

    // Total points
    const { data: pointsData } = await supabase
      .from("participants")
      .select("points");

    const totalPoints =
      pointsData?.reduce((sum, p) => sum + p.points, 0) || 0;

    // Game plays
    const { count: gameCount } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("type", "deduction");

    // Recharges
    const { count: rechargeCount } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("type", "recharge");

    // Revenue
    const { data: rechargeData } = await supabase
      .from("transactions")
      .select("points_change")
      .eq("type", "recharge");

    const totalRevenue =
      rechargeData?.reduce((sum, r) => sum + r.points_change, 0) || 0;

    // Most played game
    const { data: gamesData } = await supabase
      .from("transactions")
      .select("game_name")
      .eq("type", "deduction");

    const counts: Record<string, number> = {};
    gamesData?.forEach((g) => {
      if (!g.game_name) return;
      counts[g.game_name] = (counts[g.game_name] || 0) + 1;
    });

    let mostPlayedGame = "";
    let max = 0;
    Object.entries(counts).forEach(([game, c]) => {
      if (c > max) {
        max = c;
        mostPlayedGame = game;
      }
    });

    setStats({
      totalParticipants: participantsCount || 0,
      totalPoints,
      totalGameTransactions: gameCount || 0,
      totalRechargeTransactions: rechargeCount || 0,
      totalRevenue,
      mostPlayedGame,
    });
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