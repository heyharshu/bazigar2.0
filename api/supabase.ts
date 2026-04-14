export default async function handler(req, res) {
  const SUPABASE_URL =
    "";

  const path = req.url.replace("/api/supabase", "");

  try {
    const response = await fetch(
      `${SUPABASE_URL}${path}`,
      {
        method: req.method,
        headers: {
          ...req.headers,
          apikey: process.env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        },
        body:
          req.method !== "GET"
            ? JSON.stringify(req.body)
            : undefined,
      }
    );

    const data = await response.text();
    res.status(response.status).send(data);
  } catch (err) {
    res.status(500).json({ error: "Proxy failed" });
  }
}
