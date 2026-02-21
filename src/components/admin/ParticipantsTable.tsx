import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, QrCode, RefreshCw } from "lucide-react";
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

  // Email dialog state
  const [emailDialog, setEmailDialog] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailParticipant, setEmailParticipant] = useState<any>(null);

  const filtered = participants.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.reg?.toLowerCase().includes(search.toLowerCase())
  );

  // Generate QR and save in DB
  const generateQR = async (participant: any) => {
    try {
      if (!participant?.reg) throw new Error("REG missing");

      const qrDataUrl = await QRCode.toDataURL(participant.reg.trim(), {
        width: 300,
        margin: 2,
      });

      const { error } = await supabase
        .from("participants")
        .update({ qr_code_url: qrDataUrl })
        .eq("reg", participant.reg.trim());

      if (error) throw error;

      toast({
        title: "QR Generated",
        description: `QR saved for ${participant.name}`,
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

  // Send email FREE (mailto)
  const sendEmailFree = async () => {
    try {
      if (!emailInput.endsWith("@vitbhopal.ac.in")) {
        throw new Error("Enter valid VIT Bhopal email");
      }

      if (!emailParticipant?.qr_code_url) {
        throw new Error("QR not generated");
      }

      // Save email in DB
      await supabase
        .from("participants")
        .update({ email: emailInput })
        .eq("reg", emailParticipant.reg);

      // Auto download QR
      const link = document.createElement("a");
      link.href = emailParticipant.qr_code_url;
      link.download = `${emailParticipant.reg}-qr.png`;
      link.click();

      const subject = encodeURIComponent(
        `Your QR Code - ${emailParticipant.reg}`
      );

      const body = encodeURIComponent(`
Hello ${emailParticipant.name},

Your QR Code for Game Zone is attached.

Registration Number: ${emailParticipant.reg}

Please show this QR at entry.

Regards,
Game Zone Team
      `);

      // Open mail app
      window.location.href = `mailto:${emailInput}?subject=${subject}&body=${body}`;

      toast({
        title: "Mail Ready 📩",
        description: "QR downloaded. Attach it & click send.",
      });

      setEmailDialog(false);
      setEmailInput("");
    } catch (err: any) {
      toast({
        title: "Failed",
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
            placeholder="Search name or reg..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-secondary border-border text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto max-h-96 rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary sticky top-0">
            <tr>
              <th className="text-left p-3 text-xs">Reg</th>
              <th className="text-left p-3 text-xs">Name</th>
              <th className="text-right p-3 text-xs">Points</th>
              <th className="text-right p-3 text-xs">QR</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((p) => (
              <tr key={p.reg} className="border-t hover:bg-secondary/50">
                <td className="p-3">{p.reg}</td>
                <td className="p-3">{p.name}</td>
                <td className="p-3 text-right">{p.points}</td>

                <td className="p-3 text-right">
                  {p.qr_code_url ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedQR(p)}
                    >
                      <QrCode className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => generateQR(p)}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  )}
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
            <div className="flex flex-col items-center gap-4">
              <img
                src={selectedQR.qr_code_url}
                className="w-64 h-64 bg-white p-2 rounded"
              />

              <Button
                onClick={() => {
                  setEmailParticipant(selectedQR);
                  setEmailInput(selectedQR?.email || "");
                  setEmailDialog(true);
                }}
              >
                📩 Send QR
              </Button>
            </div>
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

            <Button onClick={sendEmailFree}>Send Email 📩</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};