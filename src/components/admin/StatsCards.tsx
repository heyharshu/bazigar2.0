import { useEffect, useState } from "react";
import { Users, Coins, Activity, Zap, Trophy } from "lucide-react";

interface StatsCardsProps {
  totalParticipants: number;
  totalPoints: number;
  totalGameTransactions: number;
  totalRechargeTransactions: number;
  totalRevenue: number;
  mostPlayedGame: string;
}

const AnimatedNumber = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 800;
    const increment = value / (duration / 16);

    const counter = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplay(value);
        clearInterval(counter);
      } else {
        setDisplay(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(counter);
  }, [value]);

  return <span>{display.toLocaleString()}</span>;
};

export const StatsCards = ({
  totalParticipants,
  totalPoints,
  totalGameTransactions,
  totalRechargeTransactions,
  totalRevenue,
  mostPlayedGame,
}: StatsCardsProps) => {
  const stats = [
    {
      label: "Participants",
      value: totalParticipants,
      icon: Users,
      color: "text-primary",
    },
    {
      label: "Total Points",
      value: totalPoints,
      icon: Coins,
      color: "text-accent",
    },
    {
      label: "Game Plays",
      value: totalGameTransactions,
      icon: Activity,
      color: "text-neon-yellow",
    },
    {
      label: "Recharges",
      value: totalRechargeTransactions,
      icon: Zap,
      color: "text-green-500",
    },
    {
      label: "Revenue (₹)",
      value: totalRevenue,
      icon: Coins,
      color: "text-emerald-400",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-card border border-border rounded-xl p-4 flex items-center gap-4"
          >
            <div className="p-3 rounded-lg bg-secondary">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono">
                <AnimatedNumber value={stat.value} />
              </p>
              <p className="text-xs text-muted-foreground font-mono uppercase">
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Most Played Game */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
        <div className="p-3 rounded-lg bg-secondary">
          <Trophy className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <p className="text-lg font-bold font-mono">
            {mostPlayedGame || "No data"}
          </p>
          <p className="text-xs text-muted-foreground font-mono uppercase">
            Most Played Game
          </p>
        </div>
      </div>
    </div>
  );
};