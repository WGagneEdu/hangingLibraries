import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(__dirname));

/* -------------------------------------
   MYSQL CONNECTION POOL
------------------------------------- */

const db = mysql.createPool({
  host: "34.138.215.83",
  user: "nodeUser",
  password: "M#Kk6U]_/hN2uC|5",
  database: "hangingLibraries",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/* -------------------------------------
   LOGIN SYSTEM
------------------------------------- */

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE username = ? AND password = ?",
      [username, password]
    );

    if (rows.length === 1) {
      const role = rows[0].role;
      return res.json({ success: true, role });
    }

    res.json({ success: false });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, error: "DB error" });
  }
});

/* -------------------------------------
   PROTECT PROFILE + STAFF PAGES
------------------------------------- */

app.get("/EditProfile.html", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

app.get("/StaffPage.html", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

/* -------------------------------------
   MAIN PAGE
------------------------------------- */

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "HomePage.html"));
});

/* -------------------------------------
   SEARCH BACKEND
------------------------------------- */

app.post("/api/search", async (req, res) => {
  const { query } = req.body;

  try {
    const [rows] = await db.query(
      `SELECT title, author, isbn, description 
       FROM books 
       WHERE title LIKE ? OR author LIKE ?`,
      [`%${query}%`, `%${query}%`]
    );

    res.redirect(`/ResultPage.html?query=${encodeURIComponent(query)}`);
  } catch (err) {
    console.error("Search error:", err);
    res.redirect(`/ResultPage.html?query=${encodeURIComponent(query)}`);
  }
});

/* -------------------------------------
   BROWSE BACKEND
------------------------------------- */

app.get("/api/browse", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM books LIMIT 100");

    res.json({ success: true, items: rows });
  } catch (err) {
    console.error("Browse error:", err);
    res.json({ success: false, items: [] });
  }
});

/* -------------------------------------
   EDIT PROFILE BACKEND
------------------------------------- */

app.post("/api/editProfile", async (req, res) => {
  const { username, email, address, phone } = req.body;

  try {
    await db.query(
      `UPDATE users 
       SET email = ?, address = ?, phone = ?
       WHERE username = ?`,
      [email, address, phone, username]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Profile update error:", err);
    res.json({ success: false });
  }
});

/* -------------------------------------
   RESULTS (if needed)
------------------------------------- */

app.get("/api/results", async (req, res) => {
  res.json({ success: true, data: [] });
});

/* -------------------------------------
   START SERVER
------------------------------------- */

const PORT = 80;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
