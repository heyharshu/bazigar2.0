import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, QrCode, RefreshCw, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import QRCode from "qrcode";

interface ParticipantsTableProps {
  participants: any[];
  search: string;
  onSearchChange: (val: string) => void;
  onRefresh: () => Promise<void>;
}

export const ParticipantsTable = ({
  participants,
  search,
  onSearchChange,
  onRefresh,
}: ParticipantsTableProps) => {

  const [selectedQR, setSelectedQR] = useState<any>(null);
  const [emailDialog, setEmailDialog] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailParticipant, setEmailParticipant] = useState<any>(null);
  const [sending, setSending] = useState(false);

  const generateQR = async (participant: any) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(participant.reg, {
        width: 200,
        margin: 1,
      });

      const { error } = await supabase
        .from("participants")
        .update({ qr_code_url: qrDataUrl })
        .eq("reg", participant.reg);

      if (error) throw error;

      toast({
        title: "QR Generated",
        description: `QR created for ${participant.name}`,
      });

      await onRefresh();
    } catch (err: any) {
      toast({
        title: "QR Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const sendEmailAuto = async (participant: any, overrideEmail?: string) => {
    try {
      const emailToSend = overrideEmail || participant.email;

      if (!emailToSend) {
        setEmailParticipant(participant);
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
            name: participant.name,
            reg: participant.reg,
            email: emailToSend,
            qr: participant.qr_code_url,
          }),
        }
      ).catch(() => {});

      toast({
        title: "Email Sent 📩",
        description: `QR sent to ${emailToSend}`,
      });

      onRefresh();

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

  return (
    <div className="bg-card border border-border rounded-xl p-4">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-mono font-semibold text-muted-foreground">
          PARTICIPANTS
        </h3>

        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by Name or Reg No..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto max-h-96 border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-secondary sticky top-0">
            <tr>
              <th className="p-3 text-left">Reg</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-right">Points</th>
              <th className="p-3 text-right">QR</th>
              <th className="p-3 text-right">Mail</th>
            </tr>
          </thead>

          <tbody>
            {participants.map((p) => (
              <tr key={p.reg} className="border-t hover:bg-secondary/40">
                <td className="p-3">{p.reg}</td>
                <td className="p-3">{p.name}</td>
                <td className="p-3 text-right">{p.points}</td>

                <td className="p-3 text-right">
                  {p.qr_code_url ? (
                    <Button size="sm" variant="ghost" onClick={() => setSelectedQR(p)}>
                      <QrCode className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => generateQR(p)}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  )}
                </td>

                <td className="p-3 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={sending}
                    onClick={() => sendEmailAuto(p)}
                  >
                    <Mail className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* QR Dialog */}
      <Dialog open={!!selectedQR} onOpenChange={() => setSelectedQR(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{selectedQR?.name}</DialogTitle>
          </DialogHeader>

          {selectedQR?.qr_code_url && (
            <img
              src={selectedQR.qr_code_url}
              className="w-64 h-64 mx-auto bg-white p-2 rounded"
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
                await supabase
                  .from("participants")
                  .update({ email: emailInput })
                  .eq("reg", emailParticipant.reg);

                sendEmailAuto(emailParticipant, emailInput);
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