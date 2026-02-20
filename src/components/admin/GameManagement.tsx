import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Gamepad2, Save } from "lucide-react";

interface GameManagementProps {
  games: any[];
  onUpdated: () => void;
}

export const GameManagement = ({ games, onUpdated }: GameManagementProps) => {
  const [editCosts, setEditCosts] = useState<Record<string, number>>({});

  const handleSave = async (game: any) => {
    const newCost = editCosts[game.id];
    if (newCost === undefined || newCost === game.cost) return;

    const { error } = await supabase
      .from("games")
      .update({ cost: newCost })
      .eq("id", game.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update game cost.", variant: "destructive" });
    } else {
      toast({ title: "Updated!", description: `${game.name} cost set to ${newCost} pts` });
      onUpdated();
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-mono font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <Gamepad2 className="w-4 h-4 text-primary" />
        GAME COSTS
      </h3>
      <div className="space-y-2">
        {games.map((game) => (
          <div key={game.id} className="flex items-center gap-2 bg-secondary rounded-lg p-2">
            <span className="flex-1 text-sm font-medium truncate">{game.name}</span>
            <Input
              type="number"
              defaultValue={game.cost}
              onChange={(e) => setEditCosts({ ...editCosts, [game.id]: parseInt(e.target.value) || 0 })}
              className="w-20 text-right bg-card border-border text-sm font-mono"
            />
            <button
              onClick={() => handleSave(game)}
              className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
