import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, QrCode, Download, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import QRCode from "qrcode";

interface ParticipantsTableProps {
  participants: any[];
  search: string;
  onSearchChange: (val: string) => void;
  onRefresh: () => void;
}

export const ParticipantsTable = ({ participants, search, onSearchChange, onRefresh }: ParticipantsTableProps) => {
  const [selectedQR, setSelectedQR] = useState<any>(null);

  const filtered = participants.filter((p) =>
    p.Name.toLowerCase().includes(search.toLowerCase()) ||
    (p.Email && p.Email.toLowerCase().includes(search.toLowerCase())) ||
    (p.reg && p.reg.toLowerCase().includes(search.toLowerCase()))
  );

  const downloadQR = (participant: any) => {
    if (!participant.qr_code_url) return;
    const link = document.createElement("a");
    link.download = `${participant.reg}-qr.png`;
    link.href = participant.qr_code_url;
    link.click();
  };

  const generateQR = async (participant: any) => {
    try {
      // Generate QR using REG number
      const qrDataUrl = await QRCode.toDataURL(participant.reg, { width: 300, margin: 2 });

      const { error } = await supabase
        .from("participants")
        .update({ qr_code_url: qrDataUrl })
        .eq("reg", participant.reg);

      if (error) {
        console.error(error);
        toast({ title: "QR Update Failed", description: error.message, variant: "destructive" });
        return;
      }

      toast({ title: "QR Generated!", description: `QR created for ${participant.Name}` });
      onRefresh();
    } catch (err) {
      toast({ title: "Error", description: "Failed to generate QR.", variant: "destructive" });
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-mono font-semibold text-muted-foreground">PARTICIPANTS</h3>
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search Name, Email, reg..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-secondary border-border text-sm"
          />
        </div>
      </div>

      <div className="overflow-auto max-h-96 rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary sticky top-0">
            <tr>
              <th className="text-left p-3 font-mono text-xs text-muted-foreground">Reg</th>
              <th className="text-left p-3 font-mono text-xs text-muted-foreground">Name</th>
              <th className="text-left p-3 font-mono text-xs text-muted-foreground">Email</th>
              <th className="text-right p-3 font-mono text-xs text-muted-foreground">Points</th>
              <th className="text-right p-3 font-mono text-xs text-muted-foreground">QR</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.reg} className="border-t border-border hover:bg-secondary/50">
                <td className="p-3 font-mono">{p.reg}</td>
                <td className="p-3 font-medium">{p.Name}</td>
                <td className="p-3 text-muted-foreground">{p.Email}</td>
                <td className="p-3 text-right font-mono text-primary">{p.points}</td>
                <td className="p-3 text-right">
                  {p.qr_code_url ? (
                    <Button variant="ghost" size="sm" onClick={() => setSelectedQR(p)}>
                      <QrCode className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => generateQR(p)} title="Generate QR">
                      <RefreshCw className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No participants found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selectedQR} onOpenChange={() => setSelectedQR(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-mono">{selectedQR?.Name}</DialogTitle>
          </DialogHeader>
          {selectedQR?.qr_code_url && (
            <div className="flex flex-col items-center gap-4">
              <img src={selectedQR.qr_code_url} alt="QR Code" className="w-64 h-64 rounded-lg bg-foreground p-2" />
              <Button onClick={() => downloadQR(selectedQR)} className="font-mono">
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