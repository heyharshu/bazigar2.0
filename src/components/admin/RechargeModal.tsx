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

export const RechargeModal = ({ participants, onRecharged }: RechargeModalProps) => {
  const [selectedReg, setSelectedReg] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRecharge = async () => {
    if (!selectedReg || !amount) return;
    setLoading(true);

    const participant = participants.find((p) => p.reg === selectedReg);
    if (!participant) {
      toast({ title: "Participant not found", variant: "destructive" });
      setLoading(false);
      return;
    }

    const pts = parseInt(amount);
    if (isNaN(pts) || pts <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
      // 🔥 Update points
      const { error: updateError } = await supabase
        .from("participants")
        .update({ points: participant.points + pts })
        .eq("reg", selectedReg);

      if (updateError) throw updateError;

      // 🔥 Insert transaction
      const { error: txnError } = await supabase.from("transactions").insert({
        participant_reg: selectedReg,
        game_id: null, // optional since manual recharge
        game_name: "Manual Recharge",
        points_change: pts,
        type: "recharge",
        scanned_by: "admin",
      });

      if (txnError) throw txnError;

      toast({
        title: "Recharged!",
        description: `${pts} pts added to ${participant.name}`,
      });

      setSelectedReg("");
      setAmount("");
      await onRecharged();

    } catch (err: any) {
      console.error(err);
      toast({
        title: "Recharge failed",
        description: err.message,
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-mono font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <Zap className="w-4 h-4 text-neon-yellow" />
        RECHARGE POINTS
      </h3>

      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Participant</Label>
          <Select value={selectedReg} onValueChange={setSelectedReg}>
            <SelectTrigger className="bg-secondary border-border mt-1">
              <SelectValue placeholder="Select participant" />
            </SelectTrigger>

            <SelectContent className="bg-card border-border">
              {participants.map((p) => (
                <SelectItem key={p.reg} value={p.reg}>
                  {p.name} ({p.points} pts)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Amount</Label>
          <Input
            type="number"
            placeholder="50"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="bg-secondary border-border mt-1 font-mono"
          />
        </div>

        <Button
          onClick={handleRecharge}
          disabled={loading || !selectedReg || !amount}
          className="w-full bg-accent text-accent-foreground font-mono"
        >
          <Plus className="w-4 h-4 mr-1" />
          {loading ? "Adding..." : "Add Points"}
        </Button>
      </div>
    </div>
  );
};