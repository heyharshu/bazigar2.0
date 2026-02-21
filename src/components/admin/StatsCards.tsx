import { Users, Coins, Activity } from "lucide-react";

interface StatsCardsProps {
  totalParticipants: number;
  totalPoints: number;
  totalTransactions: number;
}

export const StatsCards = ({ totalParticipants, totalPoints, totalTransactions }: StatsCardsProps) => {
  const stats = [
    { label: "Participants", value: totalParticipants, icon: Users, color: "text-primary" },
    { label: "Total Points", value: totalPoints.toLocaleString(), icon: Coins, color: "text-accent" },
    { label: "Transactions", value: totalTransactions, icon: Activity, color: "text-neon-yellow" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-card border border-border rounded-xl p-4 flex items-center gap-4"
        >
          <div className="p-3 rounded-lg bg-secondary">
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
          </div>
          <div>
            <p className="text-2xl font-bold font-mono">{stat.value}</p>
            <p className="text-xs text-muted-foreground font-mono uppercase">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}; 