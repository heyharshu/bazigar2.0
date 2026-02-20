import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Gamepad2, LogOut, ScanLine, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

type ScanState = "scanning" | "scanned" | "success" | "error";

const Scanner = () => {
  const navigate = useNavigate();
  const [scanState, setScanState] = useState<ScanState>("scanning");
  const [participant, setParticipant] = useState<any>(null);
  const [games, setGames] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<string>("qr-reader");

  useEffect(() => {
    supabase.from("games").select("*").order("name").then(({ data }) => {
      if (data) setGames(data);
    });
  }, []);

  const startScanner = async () => {
    setScanState("scanning");
    setParticipant(null);

    try {
      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch {}
      }

      const html5Qrcode = new Html5Qrcode(scannerContainerRef.current);
      scannerRef.current = html5Qrcode;

      await html5Qrcode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          try { await html5Qrcode.stop(); } catch {}
          handleScan(decodedText);
        },
        () => {}
      );
    } catch (err) {
      toast({ title: "Camera Error", description: "Could not access camera. Please allow camera permissions.", variant: "destructive" });
    }
  };

  useEffect(() => {
    startScanner();
    return () => {
      if (scannerRef.current) {
        try { scannerRef.current.stop(); } catch {}
      }
    };
  }, []);

  const handleScan = async (participantId: string) => {
    const { data, error } = await supabase
      .from("participants")
      .select("*")
      .eq("id", participantId)
      .single();

    if (error || !data) {
      setErrorMessage("Participant not found");
      setScanState("error");
      return;
    }

    setParticipant(data);
    setScanState("scanned");
  };

  const handleDeduct = async (game: any) => {
    if (!participant) return;

    if (participant.points < game.cost) {
      setErrorMessage(`Insufficient balance! Need ${game.cost} pts, has ${participant.points} pts`);
      setScanState("error");
      return;
    }

    const newPoints = participant.points - game.cost;

    const { error: updateError } = await supabase
      .from("participants")
      .update({ points: newPoints })
      .eq("id", participant.id);

    if (updateError) {
      setErrorMessage("Failed to deduct points");
      setScanState("error");
      return;
    }

    await supabase.from("transactions").insert({
      participant_id: participant.id,
      game_name: game.name,
      points_change: -game.cost,
      type: "deduction",
      scanned_by: "organizer",
    });

    setParticipant({ ...participant, points: newPoints });
    setScanState("success");
    toast({ title: "Points Deducted!", description: `${game.cost} pts for ${game.name}` });
  };

  const handleLogout = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
    }
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-primary" />
          <span className="font-mono font-bold text-primary text-sm">BAAZIGAR</span>
          <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded font-mono">SCAN</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      <div className="flex-1 flex flex-col">
        {scanState === "scanning" && (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm">
              <div id={scannerContainerRef.current} className="w-full rounded-xl overflow-hidden border-2 border-primary/30" />
              <p className="text-center text-muted-foreground mt-4 font-mono text-sm">
                <ScanLine className="w-4 h-4 inline mr-1" />
                Point camera at QR code
              </p>
            </div>
          </div>
        )}

        {scanState === "scanned" && participant && (
          <div className="flex-1 flex flex-col p-4">
            {/* Participant Info */}
            <div className="bg-card border border-border rounded-xl p-4 mb-4 glow-cyan">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold font-mono">{participant.name}</p>
                  <p className="text-sm text-muted-foreground">{participant.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold font-mono text-primary text-glow-cyan">{participant.points}</p>
                  <p className="text-xs text-muted-foreground">POINTS</p>
                </div>
              </div>
            </div>

            {/* Game Grid */}
            <p className="text-sm font-mono text-muted-foreground mb-2">SELECT GAME</p>
            <div className="grid grid-cols-2 gap-3 flex-1">
              {games.map((game) => (
                <button
                  key={game.id}
                  onClick={() => handleDeduct(game)}
                  disabled={participant.points < game.cost}
                  className={`rounded-xl p-4 font-mono text-sm font-semibold transition-all flex flex-col items-center justify-center gap-1 border ${
                    participant.points >= game.cost
                      ? "bg-secondary border-primary/20 hover:border-primary hover:glow-cyan active:scale-95"
                      : "bg-muted border-border opacity-50 cursor-not-allowed"
                  }`}
                >
                  <span className="text-foreground">{game.name}</span>
                  <span className="text-primary text-xs">{game.cost} pts</span>
                </button>
              ))}
            </div>

            <Button
              variant="ghost"
              className="mt-4"
              onClick={startScanner}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Scan Another
            </Button>
          </div>
        )}

        {scanState === "success" && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
            <div className="glow-green rounded-full p-6 mb-4">
              <CheckCircle2 className="w-20 h-20 text-accent" />
            </div>
            <h2 className="text-2xl font-bold font-mono text-accent mb-2">POINTS DEDUCTED</h2>
            <p className="text-muted-foreground mb-1">{participant?.name}</p>
            <p className="text-lg font-mono text-primary">Balance: {participant?.points} pts</p>
            <Button onClick={startScanner} className="mt-8 bg-primary text-primary-foreground glow-cyan font-mono">
              <ScanLine className="w-4 h-4 mr-2" />
              Scan Next
            </Button>
          </div>
        )}

        {scanState === "error" && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
            <div className="glow-red rounded-full p-6 mb-4">
              <XCircle className="w-20 h-20 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold font-mono text-destructive mb-2">ERROR</h2>
            <p className="text-muted-foreground mb-6">{errorMessage}</p>
            <Button onClick={startScanner} className="bg-primary text-primary-foreground glow-cyan font-mono">
              <ScanLine className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Scanner;
