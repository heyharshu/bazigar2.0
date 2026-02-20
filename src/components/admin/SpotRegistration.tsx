import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserPlus, Download, QrCode } from "lucide-react";
import QRCode from "qrcode";

interface RegisteredParticipant {
  reg: string;
  name: string;
  email: string;
  qr_code_url: string;
}

interface SpotRegistrationProps {
  onRegistered: () => void;
}

export const SpotRegistration = ({ onRegistered }: SpotRegistrationProps) => {
  const [reg, setReg] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState<RegisteredParticipant | null>(null);
  const [qrDialog, setQrDialog] = useState<RegisteredParticipant | null>(null);

  const handleRegister = async () => {
    if (!reg.trim() || !name.trim()) {
      toast({
        title: "REG and Name required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // 1️⃣ Insert participant
      const { data, error } = await supabase
        .from("participants")
        .insert({
          reg: reg.trim(),
          name: name.trim(),
          email: email.trim() || null,
          points: 100,
        })
        .select()
        .single();

      if (error || !data) throw error;

      // 2️⃣ Generate QR using REG
      const qrDataUrl = await QRCode.toDataURL(reg.trim(), {
        width: 300,
        margin: 2,
      });

      // 3️⃣ Save QR
      const { error: qrError } = await supabase
        .from("participants")
        .update({ qr_code_url: qrDataUrl })
        .eq("reg", reg.trim());

      if (qrError) throw qrError;

      const participant = {
        reg: reg.trim(),
        name: data.name,
        email: data.email || "",
        qr_code_url: qrDataUrl,
      };

      setRegistered(participant);

      toast({
        title: "Registration Successful",
        description: `${data.name} added`,
      });

      onRegistered();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Registration Failed",
        description: err.message || "Unknown error",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  const downloadQR = (p: RegisteredParticipant) => {
    const link = document.createElement("a");
    link.href = p.qr_code_url;
    link.download = `${p.reg}-qr.png`;
    link.click();
  };

  const reset = () => {
    setReg("");
    setName("");
    setEmail("");
    setRegistered(null);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-mono font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-primary" />
        ON-SPOT REGISTRATION
      </h3>

      {registered ? (
        <div className="space-y-3">
          <p className="text-sm font-mono text-muted-foreground">
            Participant registered successfully
          </p>

          <div className="flex items-center justify-between bg-secondary rounded-lg p-3">
            <span className="text-sm font-medium">{registered.name}</span>

            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setQrDialog(registered)}>
                <QrCode className="w-4 h-4" />
              </Button>

              <Button variant="ghost" size="sm" onClick={() => downloadQR(registered)}>
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Button variant="outline" onClick={reset} className="w-full font-mono">
            Register Another
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">REG *</Label>
            <Input
              value={reg}
              onChange={(e) => setReg(e.target.value)}
              placeholder="Enter REG number"
              className="bg-secondary border-border mt-1"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
              className="bg-secondary border-border mt-1"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
              className="bg-secondary border-border mt-1"
            />
          </div>

          <Button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-mono"
          >
            <UserPlus className="w-4 h-4 mr-1" />
            {loading ? "Registering..." : "Register"}
          </Button>
        </div>
      )}

      <Dialog open={!!qrDialog} onOpenChange={() => setQrDialog(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-mono">{qrDialog?.name}</DialogTitle>
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