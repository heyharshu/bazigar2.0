import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, QrCode, Download, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import QRCode from "qrcode";

export const ParticipantsTable = ({ participants, search, onSearchChange, onRefresh }: any) => {
  const [selectedQR, setSelectedQR] = useState<any>(null);

  const filtered = participants.filter((p: any) =>
    p.Name?.toLowerCase().includes(search.toLowerCase()) ||
    p.Email?.toLowerCase().includes(search.toLowerCase()) ||
    p.id?.toLowerCase().includes(search.toLowerCase())
  );

  const generateQR = async (participant: any) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(participant.id, { width: 300 });

      const { error } = await supabase
        .from("participants")
        .update({ qr_code_url: qrDataUrl })
        .eq("id", participant.id);

      if (error) throw error;

      toast({
        title: "QR Generated",
        description: `QR created for ${participant.Name}`,
      });

      onRefresh();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="bg-card border rounded-xl p-4">
      <Input
        placeholder="Search Name / Email / ID"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="mb-3"
      />

      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Points</th>
            <th>QR</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((p: any) => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.Name}</td>
              <td>{p.Email}</td>
              <td>{p.points}</td>
              <td>
                {p.qr_code_url ? (
                  <QrCode onClick={() => setSelectedQR(p)} />
                ) : (
                  <RefreshCw onClick={() => generateQR(p)} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={!!selectedQR} onOpenChange={() => setSelectedQR(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedQR?.Name}</DialogTitle>
          </DialogHeader>
          {selectedQR?.qr_code_url && (
            <img src={selectedQR.qr_code_url} className="w-64 mx-auto" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};