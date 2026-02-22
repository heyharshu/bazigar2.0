import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserPlus, QrCode, Mail } from "lucide-react";
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
  const [registered, setRegistered] =
    useState<RegisteredParticipant | null>(null);
  const [qrDialog, setQrDialog] =
    useState<RegisteredParticipant | null>(null);

  const [sending, setSending] = useState(false);
  const [emailDialog, setEmailDialog] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  // 🔹 Register participant
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

      // 2️⃣ Generate QR
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

  // 🔹 Send Email
  const sendEmailAuto = async (
    p: RegisteredParticipant,
    overrideEmail?: string
  ) => {
    try {
      const emailToSend = overrideEmail || p.email;

      if (!emailToSend) {
        setEmailInput("");
        setEmailDialog(true);
        return;
      }

      setSending(true);

      fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-qr-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            name: p.name,
            reg: p.reg,
            email: emailToSend,
            qr: p.qr_code_url,
          }),
        }
      ).catch(() => {});

      toast({
        title: "Email Sent 📩",
        description: `QR sent to ${emailToSend}`,
      });

      setTimeout(() => setSending(false), 1000);
    } catch (err: any) {
      setSending(false);
      toast({
        title: "Email Failed",
        description: err.message,
        variant: "destructive",
      });
    }
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQrDialog(registered)}
              >
                <QrCode className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                disabled={sending}
                onClick={() => sendEmailAuto(registered)}
              >
                <Mail className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Button variant="outline" onClick={reset} className="w-full font-mono">
            Register Another
          </Button>
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            handleRegister();
          }}
        >
          <div>
            <Label className="text-xs text-muted-foreground">REG *</Label>
            <Input
              value={reg}
              onChange={(e) => setReg(e.target.value)}
              placeholder="Enter Registration number"
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
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-mono"
          >
            <UserPlus className="w-4 h-4 mr-1" />
            {loading ? "Registering..." : "Register"}
          </Button>
        </form>
      )}

      {/* QR Dialog */}
      <Dialog open={!!qrDialog} onOpenChange={() => setQrDialog(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {qrDialog?.name}
            </DialogTitle>
          </DialogHeader>

          {qrDialog?.qr_code_url && (
            <img
              src={qrDialog.qr_code_url}
              className="w-64 h-64 bg-white p-2 rounded mx-auto"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={emailDialog} onOpenChange={setEmailDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Enter Email</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <Input
              placeholder="example@vitbhopal.ac.in"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
            />

            <Button
              disabled={sending}
              onClick={async () => {
                if (!registered) return;

                await supabase
                  .from("participants")
                  .update({ email: emailInput })
                  .eq("reg", registered.reg);

                sendEmailAuto(
                  { ...registered, email: emailInput },
                  emailInput
                );

                setEmailDialog(false);
              }}
            >
              {sending ? "Sending..." : "Send Email"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};