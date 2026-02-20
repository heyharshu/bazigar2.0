
-- Create games table
CREATE TABLE public.games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cost INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create participants table
CREATE TABLE public.participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  points INTEGER NOT NULL DEFAULT 100,
  qr_code_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE NOT NULL,
  game_name TEXT NOT NULL,
  points_change INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deduction', 'recharge')),
  scanned_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies - authenticated users can do everything (internal tool)
CREATE POLICY "Authenticated users can read games" ON public.games FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert games" ON public.games FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update games" ON public.games FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete games" ON public.games FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read participants" ON public.participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert participants" ON public.participants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update participants" ON public.participants FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete participants" ON public.participants FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read transactions" ON public.transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (true);

-- Enable realtime for transactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;

-- Seed default games
INSERT INTO public.games (name, cost) VALUES
  ('Pac-Man', 10),
  ('Space Invaders', 15),
  ('Tetris', 10),
  ('Snake', 5),
  ('Pong', 5),
  ('Breakout', 10),
  ('Asteroids', 15),
  ('Galaga', 20);
