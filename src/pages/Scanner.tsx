import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Gamepad2,
  LogOut,
  ScanLine,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Trophy,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

type ScanState = "scanning" | "scanned" | "success" | "error";

const Scanner = () => {
  const navigate = useNavigate();
  const [scanState, setScanState] = useState<ScanState>("scanning");
  const [participant, setParticipant] = useState<any>(null);
  const [games, setGames] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<string>("qr-reader");

  /* ---------------- Load Games + Leaderboard ---------------- */
  const loadData = async () => {
    const { data: g } = await supabase.from("games").select("*").order("name");
    const { data: l } = await supabase
      .from("participants")
      .select("name, points")
      .order("points", { ascending: false })
      .limit(5);

    if (g) setGames(g);
    if (l) setLeaderboard(l);
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ---------------- Start Scanner ---------------- */
  const startScanner = async () => {
    setScanState("scanning");
    setParticipant(null);

    try {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {}
      }

      const html5Qrcode = new Html5Qrcode(scannerContainerRef.current);
      scannerRef.current = html5Qrcode;

      await html5Qrcode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          try {
            await html5Qrcode.stop();
          } catch {}
          handleScan(decodedText); // decodedText = REG
        },
        () => {}
      );
    } catch {
      toast({
        title: "Camera Error",
        description: "Allow camera permission",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    startScanner();
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop();
        } catch {}
      }
    };
  }, []);

  /* ---------------- Handle Scan (REG based) ---------------- */
  const handleScan = async (reg: string) => {
    const { data, error } = await supabase
      .from("participants")
      .select("*")
      .eq("reg", reg)
      .single();

    if (error || !data) {
      setErrorMessage("Participant not found");
      setScanState("error");
      return;
    }

    setParticipant(data);
    setScanState("scanned");
  };

  /* ---------------- Deduct Points ---------------- */
  const handleDeduct = async (game: any) => {
    if (!participant) return;

    if (participant.points < game.cost) {
      setErrorMessage(
        `Insufficient points! Need ${game.cost}, has ${participant.points}`
      );
      setScanState("error");
      return;
    }

    const newPoints = participant.points - game.cost;

    const { error } = await supabase
      .from("participants")
      .update({ points: newPoints })
      .eq("reg", participant.reg);

    if (error) {
      setErrorMessage("Deduction failed");
      setScanState("error");
      return;
    }

    await supabase.from("transactions").insert({
      reg: participant.reg,
      game_name: game.name,
      points_change: -game.cost,
      type: "deduction",
      scanned_by: "organizer",
    });

    setParticipant({ ...participant, points: newPoints });
    setScanState("success");
    loadData();

    toast({
      title: "Points Deducted",
      description: `${game.cost} pts for ${game.name}`,
    });
  };

  /* ---------------- Logout ---------------- */
  const handleLogout = async () => {
    navigate("/login");
  };

  /* ============================================================ */
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* HEADER */}
      <header className="border-b bg-card p-3 flex justify-between">
        <div className="flex gap-2 items-center">
          <Gamepad2 className="w-5 h-5 text-primary" />
          <span className="font-bold font-mono text-primary">BAAZIGAR</span>
        </div>
        <Button size="sm" variant="ghost" onClick={handleLogout}>
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      {/* ================= SCANNING ================= */}
      {scanState === "scanning" && (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div id={scannerContainerRef.current} className="w-full max-w-sm" />
          <p className="mt-3 text-sm text-muted-foreground font-mono">
            <ScanLine className="inline w-4 h-4 mr-1" />
            Scan QR
          </p>

          {/* Leaderboard */}
          <div className="mt-8 w-full max-w-sm bg-card border rounded-xl p-4">
            <p className="font-mono text-sm mb-2 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              Leaderboard
            </p>

            {leaderboard.map((p, i) => (
              <div key={i} className="flex justify-between text-sm py-1">
                <span>{i + 1}. {p.name}</span>
                <span className="text-primary font-mono">{p.points}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= PARTICIPANT ================= */}
      {scanState === "scanned" && participant && (
        <div className="p-4 flex-1">
          <div className="bg-card border rounded-xl p-4 mb-4">
            <p className="text-lg font-bold">{participant.name}</p>
            <p className="text-sm text-muted-foreground">{participant.email}</p>
            <p className="text-3xl text-primary font-mono">
              {participant.points} pts
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {games.map((game) => (
              <button
                key={game.id}
                onClick={() => handleDeduct(game)}
                disabled={participant.points < game.cost}
                className={`p-4 rounded-xl border ${
                  participant.points >= game.cost
                    ? "bg-secondary hover:border-primary"
                    : "opacity-50 cursor-not-allowed"
                }`}
              >
                <p>{game.name}</p>
                <p className="text-xs text-primary">{game.cost} pts</p>
              </button>
            ))}
          </div>

          <Button className="mt-4 w-full" onClick={startScanner}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Scan Another
          </Button>
        </div>
      )}

      {/* ================= SUCCESS ================= */}
      {scanState === "success" && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <CheckCircle2 className="w-20 h-20 text-green-500 mb-4" />
          <p className="text-xl font-bold">Points Deducted</p>
          <p>{participant?.name}</p>
          <p className="text-primary">{participant?.points} pts</p>
          <Button className="mt-6" onClick={startScanner}>
            Scan Next
          </Button>
        </div>
      )}

      {/* ================= ERROR ================= */}
      {scanState === "error" && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <XCircle className="w-20 h-20 text-red-500 mb-4" />
          <p className="text-xl font-bold">Error</p>
          <p>{errorMessage}</p>
          <Button className="mt-6" onClick={startScanner}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
};

export default Scanner;