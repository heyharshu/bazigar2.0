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

const TIER_CONFIG: Record<Tier, { label: string; count: number }> = {
  solo: { label: "Solo", count: 1 },
  duo: { label: "Duo", count: 2 },
  group: { label: "Group of 4", count: 4 },
};

interface MemberInput {
  name: string;
  email: string;
  phone: string;
}

interface RegisteredParticipant {
  reg: string;
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
    setMembers(Array.from({ length: TIER_CONFIG[value].count }, () => ({ name: "", email: "", phone: "" })));
    setRegistered([]);
  };

  const updateMember = (index: number, field: keyof MemberInput, value: string) => {
    setMembers((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  };

  // 🔒 collision-safe REG generator
  const generateReg = async () => {
    while (true) {
      const reg = "SPOT-" + Math.random().toString(36).substring(2, 10).toUpperCase();

      const { data } = await supabase
        .from("participants")
        .select("reg")
        .eq("reg", reg)
        .maybeSingle();

      if (!data) return reg; // unique
    }
  };

  const handleRegister = async () => {
    if (!members.every((m) => m.name.trim())) {
      toast({ title: "Name required for all members", variant: "destructive" });
      return;
    }

    setLoading(true);
    const results: RegisteredParticipant[] = [];

    try {
      for (const member of members) {
        const reg = await generateReg();

        const { data: inserted, error } = await supabase
          .from("participants")
          .insert({
            reg,
            name: member.name.trim(),
            email: member.email.trim() || null,
            phone: member.phone.trim() || null,
          })
          .select()
          .single();

        if (error || !inserted) {
          console.error(error);
          continue;
        }

        const qrDataUrl = await QRCode.toDataURL(reg, { width: 300, margin: 2 });

        await supabase
          .from("participants")
          .update({ qr_code_url: qrDataUrl })
          .eq("reg", reg);

        const record = { reg, name: inserted.name, qr_code_url: qrDataUrl };
        results.push(record);

        // 🔥 auto open QR after each registration (old behavior)
        setQrDialog(record);
      }

      setRegistered(results);
      toast({
        title: "Registration Complete!",
        description: `${results.length} participant(s) added`,
      });

      onRegistered();
    } catch (err) {
      console.error(err);
      toast({ title: "Registration failed", variant: "destructive" });
    }

    setLoading(false);
  };

  const downloadQR = (p: RegisteredParticipant) => {
    const link = document.createElement("a");
    link.href = p.qr_code_url;
    link.download = `${p.name}-qr.png`;
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

          {registered.map((p) => (
            <div key={p.reg} className="flex items-center justify-between bg-secondary rounded-lg p-3">
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

          <Button variant="outline" onClick={reset} className="w-full font-mono">
            Register Another
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
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

          {members.map((member, i) => (
            <div key={i} className="space-y-2 border-t pt-3 first:border-0 first:pt-0">
              <Input
                placeholder="Name *"
                value={member.name}
                onChange={(e) => updateMember(i, "name", e.target.value)}
              />

              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Email"
                  value={member.email}
                  onChange={(e) => updateMember(i, "email", e.target.value)}
                />
                <Input
                  placeholder="Phone"
                  value={member.phone}
                  onChange={(e) => updateMember(i, "phone", e.target.value)}
                />
              </div>
            </div>
          ))}

          <Button onClick={handleRegister} disabled={loading} className="w-full">
            <UserPlus className="w-4 h-4 mr-1" />
            {loading ? "Registering..." : `Register ${TIER_CONFIG[tier].label}`}
          </Button>
        </div>
      )}

      <Dialog open={!!qrDialog} onOpenChange={() => setQrDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{qrDialog?.name}</DialogTitle>
          </DialogHeader>

          {qrDialog?.qr_code_url && (
            <div className="flex flex-col items-center gap-4">
              <img src={qrDialog.qr_code_url} className="w-64 h-64 bg-white p-2 rounded" />
              <Button onClick={() => downloadQR(qrDialog!)}>
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