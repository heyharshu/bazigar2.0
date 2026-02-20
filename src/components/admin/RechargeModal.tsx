import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Zap } from "lucide-react";

interface RechargeModalProps {
  participants: any[];
  onRecharged: () => void;
}

export const RechargeModal = ({
  participants,
  onRecharged,
}: RechargeModalProps) => {
  const [selectedId, setSelectedId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRecharge = async () => {
    if (!selectedId || !amount) return;

    const participant = participants.find((p) => p.id === selectedId);
    if (!participant) {
      toast({ title: "Participant not found", variant: "destructive" });
      return;
    }

    const pts = parseInt(amount);
    if (isNaN(pts) || pts <= 0) {
      toast({
        title: "Invalid amount",
        description: "Enter a valid positive number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // 🔹 Update participant points
      const { error: updateError } = await supabase
        .from("participants")
        .update({ points: participant.points + pts })
        .eq("id", selectedId);

      if (updateError) throw updateError;

      // 🔹 Insert transaction log
      const { error: txError } = await supabase.from("transactions").insert({
        participant_id: selectedId,
        game_name: "Manual Recharge",
        points_change: pts,
        type: "recharge",
        scanned_by: "admin",
      });

      if (txError) throw txError;

      toast({
        title: "Recharge Successful!",
        description: `${pts} points added to ${participant.name}`,
      });

      setSelectedId("");
      setAmount("");
      onRecharged();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Recharge Failed",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-mono font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <Zap className="w-4 h-4 text-yellow-400" />
        RECHARGE POINTS
      </h3>

      <div className="space-y-3">
        {/* Participant Select */}
        <div>
          <Label className="text-xs text-muted-foreground">
            Participant
          </Label>

          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="bg-secondary border-border mt-1">
              <SelectValue placeholder="Select participant" />
            </SelectTrigger>

            <SelectContent className="bg-card border-border max-h-60 overflow-auto">
              {participants.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} ({p.points} pts)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Amount */}
        <div>
          <Label className="text-xs text-muted-foreground">
            Amount
          </Label>
          <Input
            type="number"
            placeholder="Enter points (e.g. 50)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="bg-secondary border-border mt-1 font-mono"
          />
        </div>

        {/* Button */}
        <Button
          onClick={handleRecharge}
          disabled={loading || !selectedId || !amount}
          className="w-full bg-primary text-primary-foreground font-mono"
        >
          <Plus className="w-4 h-4 mr-1" />
          {loading ? "Adding..." : "Add Points"}
        </Button>
      </div>
    </div>
  );
};