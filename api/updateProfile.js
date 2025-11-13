export default function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }

  res.status(200).json({ success: true, message: "Profile update placeholder" });
}
