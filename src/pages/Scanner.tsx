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
  const [scannerUser, setScannerUser] = useState("organizer");

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "qr-reader";

  /* ================= SOUND + VIBRATION ================= */

  const vibrate = (pattern: number | number[]) => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  const playBeep = (frequency: number, duration = 120) => {
    try {
      const audioCtx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;

      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(
        0.00001,
        audioCtx.currentTime + duration / 1000
      );

      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, duration);
    } catch {}
  };

  const playSuccessFeedback = () => {
    playBeep(880, 120);
    setTimeout(() => playBeep(1200, 120), 140);
    vibrate([120, 40, 120]); // 📳 strong vibration
  };

  const playErrorFeedback = () => {
    playBeep(220, 220);
    vibrate(200); // 📳 short vibration
  };

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

    supabase.auth.getUser().then(({ data }) => {
      const userName =
        data?.user?.user_metadata?.name ||
        data?.user?.email ||
        "organizer";
      setScannerUser(userName);
    });
  }, []);

  /* ================= SCANNER CONTROL ================= */

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}

      try {
        await scannerRef.current.clear();
      } catch {}

      scannerRef.current = null;
      await new Promise((res) => setTimeout(res, 350));
    }
  };

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
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await stopScanner();
          handleScan(decodedText);
        }
      );
    } catch (err) {
      toast({
        title: "Camera Error",
        description: "Refresh if camera fails.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    startScanner();
    return () => stopScanner();
  }, []);

  /* ================= HANDLE SCAN ================= */

  const handleScan = async (reg: string) => {
    const { data, error } = await supabase
      .from("participants")
      .select("*")
      .eq("reg", reg)
      .single();

    if (error || !data) {
      playErrorFeedback();
      setErrorMessage("Participant not found");
      setScanState("error");
      return;
    }

    setParticipant(data);
    setScanState("scanned");
  };

  /* ================= DEDUCT ================= */

  const handleDeduct = async (game: any) => {
    if (!participant) return;

    if (participant.points < game.cost) {
      playErrorFeedback();
      setErrorMessage(
        `Insufficient points! Need ${game.cost}, has ${participant.points}`
      );
      setScanState("error");
      return;
    }

    const newPoints = participant.points - game.cost;

    try {
      await supabase
        .from("participants")
        .update({ points: newPoints })
        .eq("reg", participant.reg);

      await supabase.from("transactions").insert({
        participant_reg: participant.reg,
        game_id: game.id,
        game_name: game.name,
        points_change: -game.cost,
        type: "deduction",
        scanned_by: scannerUser,
      });

      setParticipant({ ...participant, points: newPoints });
      setScanState("success");
      playSuccessFeedback();
      loadData();

      toast({
        title: "Points Deducted",
        description: `${game.cost} pts for ${game.name}`,
      });
    } catch (err: any) {
      playErrorFeedback();
      setErrorMessage("Transaction failed");
      setScanState("error");
    }
  };

  const handleLogout = () => {
    stopScanner();
    navigate("/login");
  };

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card p-3 flex justify-between">
        <div className="flex gap-2 items-center">
          <Gamepad2 className="w-5 h-5 text-primary" />
          <span className="font-bold font-mono text-primary">BAAZIGAR</span>
        </div>
        <Button size="sm" variant="ghost" onClick={handleLogout}>
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      {scanState === "scanning" && (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div id={scannerContainerId} className="w-full max-w-sm" />
          <p className="mt-3 text-sm text-muted-foreground font-mono">
            <ScanLine className="inline w-4 h-4 mr-1" />
            Scan QR
          </p>

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

      {scanState === "success" && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <CheckCircle2 className="w-20 h-20 text-green-500 mb-4" />
          <p className="text-xl font-bold">Success</p>
          <p>{participant?.name}</p>
          <p className="text-primary">{participant?.points} pts</p>
          <Button className="mt-6" onClick={startScanner}>
            Scan Next
          </Button>
        </div>
      )}

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