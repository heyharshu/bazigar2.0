import { useState, useMemo } from "react";
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
import { Plus, Zap, Search } from "lucide-react";

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
  const [search, setSearch] = useState("");

  // 🔍 Filter participants by name or reg
  const filteredParticipants = useMemo(() => {
    if (!search) return participants;

    const s = search.toLowerCase();
    return participants.filter(
      (p) =>
        p.name?.toLowerCase().includes(s) ||
        p.reg?.toLowerCase().includes(s)
    );
  }, [participants, search]);

  const handleRecharge = async () => {
    if (!selectedId || !amount) return;

    const participant = participants.find((p) => p.reg === selectedId);
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
      // Update points
      const { error: updateError } = await supabase
        .from("participants")
        .update({ points: participant.points + pts })
        .eq("reg", selectedId);

      if (updateError) throw updateError;

      // Log transaction
      const { error: txError } = await supabase.from("transactions").insert({
        participant_reg: selectedId,
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
      setSearch("");
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

        {/* Participant Select with Search */}
        <div>
          <Label className="text-xs text-muted-foreground">
            Participant
          </Label>

          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="bg-secondary border-border mt-1">
              <SelectValue placeholder="Select Participant" />
            </SelectTrigger>

            <SelectContent className="bg-card border-border max-h-72">

              {/* 🔍 Search box */}
              <div className="p-2 border-b border-border sticky top-0 bg-card">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search Participant "
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-7 h-8 text-sm bg-secondary"
                  />
                </div>
              </div>

              {/* List */}
              <div className="max-h-60 overflow-auto">
                {filteredParticipants.length === 0 && (
                  <div className="p-3 text-xs text-muted-foreground text-center">
                    No participant found
                  </div>
                )}

                {filteredParticipants.map((p) => (
                  <SelectItem key={p.reg} value={p.reg}>
                    {p.name} — {p.reg} ({p.points} pts)
                  </SelectItem>
                ))}
              </div>
            </SelectContent>
          </Select>
        </div>

        {/* Amount */}
        <div>
          <Label className="text-xs text-muted-foreground">Amount</Label>
          <Input
            type="number"
            placeholder="Enter points "
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