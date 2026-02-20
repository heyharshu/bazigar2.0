import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserPlus, Download, QrCode } from "lucide-react";
import QRCode from "qrcode";

type Tier = "solo" | "duo" | "group";

const TIER_CONFIG: Record<Tier, { label: string; count: number; points: number }> = {
  solo: { label: "Solo", count: 1, points: 100 },
  duo: { label: "Duo", count: 2, points: 100 },
  group: { label: "Group of 4", count: 4, points: 100 },
};

interface MemberInput {
  name: string;
  email: string;
  phone: string;
}

interface RegisteredParticipant {
  id: string;
  name: string;
  qr_code_url: string;
}

interface SpotRegistrationProps {
  onRegistered: () => void;
}

export const SpotRegistration = ({ onRegistered }: SpotRegistrationProps) => {
  const [tier, setTier] = useState<Tier>("solo");
  const [members, setMembers] = useState<MemberInput[]>([{ name: "", email: "", phone: "" }]);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState<RegisteredParticipant[]>([]);
  const [qrDialog, setQrDialog] = useState<RegisteredParticipant | null>(null);

  const handleTierChange = (value: Tier) => {
    setTier(value);
    const count = TIER_CONFIG[value].count;
    setMembers(Array.from({ length: count }, () => ({ name: "", email: "", phone: "" })));
    setRegistered([]);
  };

  const updateMember = (index: number, field: keyof MemberInput, value: string) => {
    setMembers((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  };

  const handleRegister = async () => {
    const valid = members.every((m) => m.name.trim());
    if (!valid) {
      toast({ title: "Name is required for all members", variant: "destructive" });
      return;
    }

    setLoading(true);
    const results: RegisteredParticipant[] = [];

    try {
      for (const member of members) {
        const { data: inserted, error } = await supabase
          .from("participants")
          .insert({
            name: member.name.trim(),
            email: member.email.trim() || null,
            phone: member.phone.trim() || null,
          })
          .select()
          .single();

        if (error || !inserted) {
          console.error("Insert error:", error);
          continue;
        }

        const qrDataUrl = await QRCode.toDataURL(inserted.id, { width: 300, margin: 2 });
        await supabase.from("participants").update({ qr_code_url: qrDataUrl }).eq("id", inserted.id);

        results.push({ id: inserted.id, name: inserted.name, qr_code_url: qrDataUrl });
      }

      setRegistered(results);
      toast({ title: "Registration Complete!", description: `${results.length} participant(s) added.` });
      onRegistered();
    } catch {
      toast({ title: "Error", description: "Registration failed.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = (p: RegisteredParticipant) => {
    const link = document.createElement("a");
    link.download = `${p.name}-qr.png`;
    link.href = p.qr_code_url;
    link.click();
  };

  const reset = () => {
    setMembers([{ name: "", email: "", phone: "" }]);
    setTier("solo");
    setRegistered([]);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-mono font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-primary" />
        ON-SPOT REGISTRATION
      </h3>

      {registered.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground font-mono">
            {registered.length} participant(s) registered successfully
          </p>
          <div className="space-y-2">
            {registered.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                <span className="text-sm font-medium">{p.name}</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setQrDialog(p)}>
                    <QrCode className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => downloadQR(p)}>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" onClick={reset} className="w-full font-mono">
            Register Another
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Tier Selection */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Tier</Label>
            <RadioGroup value={tier} onValueChange={(v) => handleTierChange(v as Tier)} className="flex gap-3">
              {(Object.keys(TIER_CONFIG) as Tier[]).map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <RadioGroupItem value={key} id={`tier-${key}`} />
                  <Label htmlFor={`tier-${key}`} className="text-sm cursor-pointer">
                    {TIER_CONFIG[key].label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Member Inputs */}
          {members.map((member, i) => (
            <div key={i} className="space-y-2 border-t border-border pt-3 first:border-0 first:pt-0">
              {members.length > 1 && (
                <p className="text-xs text-muted-foreground font-mono">Member {i + 1}</p>
              )}
              <Input
                placeholder="Name *"
                value={member.name}
                onChange={(e) => updateMember(i, "name", e.target.value)}
                className="bg-secondary border-border text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Email"
                  value={member.email}
                  onChange={(e) => updateMember(i, "email", e.target.value)}
                  className="bg-secondary border-border text-sm"
                />
                <Input
                  placeholder="Phone"
                  value={member.phone}
                  onChange={(e) => updateMember(i, "phone", e.target.value)}
                  className="bg-secondary border-border text-sm"
                />
              </div>
            </div>
          ))}

          <Button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-mono"
          >
            <UserPlus className="w-4 h-4 mr-1" />
            {loading ? "Registering..." : `Register ${TIER_CONFIG[tier].label}`}
          </Button>
        </div>
      )}

      {/* QR Preview Dialog */}
      <Dialog open={!!qrDialog} onOpenChange={() => setQrDialog(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-mono">{qrDialog?.name}</DialogTitle>
          </DialogHeader>
          {qrDialog?.qr_code_url && (
            <div className="flex flex-col items-center gap-4">
              <img src={qrDialog.qr_code_url} alt="QR Code" className="w-64 h-64 rounded-lg bg-foreground p-2" />
              <Button onClick={() => downloadQR(qrDialog)} className="font-mono">
                <Download className="w-4 h-4 mr-2" />
                Download QR
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
