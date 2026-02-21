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
  const scannerContainerId = "qr-reader";

  /* ================= LOAD DATA ================= */
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

  /* ================= SAFE SCANNER STOP ================= */
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}

      try {
        await scannerRef.current.clear();
      } catch {}

      scannerRef.current = null;

      // Important delay for mobile camera release
      await new Promise((res) => setTimeout(res, 400));
    }
  };

  /* ================= START SCANNER ================= */
  const startScanner = async () => {
    try {
      setScanState("scanning");
      setParticipant(null);
      setErrorMessage("");

      await stopScanner();

      const html5Qrcode = new Html5Qrcode(scannerContainerId);
      scannerRef.current = html5Qrcode;

      await html5Qrcode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          await stopScanner();
          handleScan(decodedText);
        },
        () => {}
      );
    } catch (err) {
      console.error("Camera restart error:", err);
      toast({
        title: "Camera Error",
        description: "If issue persists, refresh once.",
        variant: "destructive",
      });
    }
  };

  /* ================= INITIAL MOUNT ================= */
  useEffect(() => {
    startScanner();

    return () => {
      stopScanner();
    };
  }, []);

  /* ================= HANDLE SCAN ================= */
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

  /* ================= DEDUCT POINTS ================= */
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

  /* ================= LOGOUT ================= */
  const handleLogout = () => {
    stopScanner();
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
          <div id={scannerContainerId} className="w-full max-w-sm" />
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
                <span>
                  {i + 1}. {p.name}
                </span>
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
            <p className="text-sm text-muted-foreground">
              {participant.email}
            </p>
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