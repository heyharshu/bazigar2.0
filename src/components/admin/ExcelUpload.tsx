import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, Check, X } from "lucide-react";
import * as XLSX from "xlsx";
import QRCode from "qrcode";

interface ParsedRow {
  name: string;
  email: string;
  phone: string;
}

interface ExcelUploadProps {
  onImported: () => void;
}

export const ExcelUpload = ({ onImported }: ExcelUploadProps) => {
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<any>(sheet);

        const rows: ParsedRow[] = json.map((row: any) => ({
          name: row.Name || row.name || "",
          email: row.Email || row.email || "",
          phone: String(row.Phone || row.phone || ""),
        })).filter((r: ParsedRow) => r.name);

        setPreview(rows);
        toast({ title: `${rows.length} participants found`, description: "Review and confirm import." });
      } catch {
        toast({ title: "Parse Error", description: "Could not read the file.", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const confirmImport = async () => {
    setImporting(true);
    try {
      for (const row of preview) {
        const { data: inserted, error } = await supabase
          .from("participants")
          .insert({ name: row.name, email: row.email, phone: row.phone })
          .select()
          .single();

        if (error) {
          console.error("Insert error:", error);
          continue;
        }

        // Generate QR code URL (data URL with participant ID)
        const qrDataUrl = await QRCode.toDataURL(inserted.id, { width: 300, margin: 2 });
        await supabase.from("participants").update({ qr_code_url: qrDataUrl }).eq("id", inserted.id);
      }

      toast({ title: "Import Complete!", description: `${preview.length} participants added.` });
      setPreview([]);
      onImported();
    } catch (err) {
      toast({ title: "Import Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-mono font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <FileSpreadsheet className="w-4 h-4 text-primary" />
        EXCEL IMPORT
      </h3>

      {preview.length === 0 ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
          }`}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-1">Drop .xlsx file here or click to upload</p>
          <p className="text-xs text-muted-foreground">Columns: Name, Email, Phone</p>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileInput}
            className="absolute inset-0 opacity-0 cursor-pointer"
            style={{ position: "relative" }}
          />
        </div>
      ) : (
        <div>
          <div className="max-h-48 overflow-auto mb-3 rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary sticky top-0">
                <tr>
                  <th className="text-left p-2 font-mono text-xs text-muted-foreground">Name</th>
                  <th className="text-left p-2 font-mono text-xs text-muted-foreground">Email</th>
                  <th className="text-left p-2 font-mono text-xs text-muted-foreground">Phone</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="p-2">{row.name}</td>
                    <td className="p-2 text-muted-foreground">{row.email}</td>
                    <td className="p-2 text-muted-foreground">{row.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={confirmImport}
              disabled={importing}
              className="bg-primary text-primary-foreground font-mono"
            >
              <Check className="w-4 h-4 mr-1" />
              {importing ? "Importing..." : `Confirm Import (${preview.length})`}
            </Button>
            <Button variant="ghost" onClick={() => setPreview([])}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
