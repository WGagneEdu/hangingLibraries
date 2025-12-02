import express from "express";
import path from "path";
import mysql from "mysql2";
import { fileURLToPath } from "url";

const app = express();

/* =======================================================
   BASIC MIDDLEWARE + STATIC FILE HOSTING
======================================================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve all HTML/CSS/JS/images
app.use(express.static(__dirname));

/* =======================================================
   MYSQL CONNECTION
======================================================= */
const db = mysql.createConnection({
  host: "34.138.215.83",
  user: "nodeUser",
  password: "M#Kk6U]_/hN2uC|5",            // <-- add your password here if needed
  database: "hanging_libraries"
});

db.connect((err) => {
  if (err) console.log("❌ DB ERROR:", err);
  else console.log("✔ Connected to MySQL");
});

/* =======================================================
   LOGIN (REAL)
======================================================= */
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  const sql = `
    SELECT username, role
    FROM users
    WHERE username=? AND password=?
  `;

  db.query(sql, [username, password], (err, result) => {
    if (err) return res.json({ success: false });

    if (result.length === 0) return res.json({ success: false });

    return res.json({
      success: true,
      role: result[0].role,
      username: result[0].username
    });
  });
});

/* =======================================================
   PROTECTED PAGE FALLBACKS
   (If user tries direct URL, show login.html)
======================================================= */

// NOTE: These filenames MUST match your actual HTML names

app.get("/editProfilePage.html", (req, res) =>
  res.sendFile(path.join(__dirname, "loginPage.html"))
);

app.get("/staffPage.html", (req, res) =>
  res.sendFile(path.join(__dirname, "loginPage.html"))
);

app.get("/staffInventoryPage.html", (req, res) =>
  res.sendFile(path.join(__dirname, "loginPage.html"))
);

app.get("/staffMemberAccountsPage.html", (req, res) =>
  res.sendFile(path.join(__dirname, "loginPage.html"))
);

/* =======================================================
   HOME PAGE
======================================================= */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "homePage.html"));
});

/* =======================================================
   SEARCH → REDIRECT TO RESULTS PAGE
======================================================= */
app.post("/api/search", (req, res) => {
  const { query } = req.body;
  res.redirect(`/resultsPage.html?query=${encodeURIComponent(query)}`);
});

/* =======================================================
   REAL BOOK SEARCH (Results Page)
======================================================= */
app.get("/api/results", (req, res) => {
  const q = `%${req.query.query}%`;

  const sql = `
    SELECT * FROM books
    WHERE title LIKE ? OR author LIKE ? OR description LIKE ?
  `;

  db.query(sql, [q, q, q], (err, rows) => {
    if (err) return res.json({ success: false });

    return res.json({ success: true, data: rows });
  });
});

/* =======================================================
   BROWSE ALL BOOKS
======================================================= */
app.get("/api/browse", (req, res) => {
  db.query("SELECT * FROM books ORDER BY title ASC", (err, rows) => {
    if (err) return res.json({ success: false });

    return res.json({
      success: true,
      items: rows
    });
  });
});

/* =======================================================
   EDIT PROFILE
======================================================= */
app.post("/api/editProfile", (req, res) => {
  const { username, fullName, email, address, phone, password } = req.body;

  const sql = `
    UPDATE users SET
      fullName=?, email=?, address=?, phone=?,
      password = IF(?='', password, ?)
    WHERE username=?
  `;

  db.query(
    sql,
    [fullName, email, address, phone, password, password, username],
    (err) => {
      if (err) return res.json({ success: false });
      return res.json({ success: true });
    }
  );
});

/* =======================================================
   LOAD PROFILE DATA
======================================================= */
app.get("/api/getUserProfile", (req, res) => {
  const username = req.query.username;

  const sql = `SELECT * FROM users WHERE username=?`;

  db.query(sql, [username], (err, rows) => {
    if (err || rows.length === 0)
      return res.json({ success: false });

    return res.json({ success: true, user: rows[0] });
  });
});

/* =======================================================
   STAFF: LOAD MEMBER (username OR membershipID)
======================================================= */
app.get("/api/getMember", (req, res) => {
  const id = req.query.identifier;

  const sql = `
    SELECT *
    FROM users
    WHERE username=? OR membershipID=?
  `;

  db.query(sql, [id, id], (err, rows) => {
    if (err || rows.length === 0)
      return res.json({ success: false });

    return res.json({ success: true, member: rows[0] });
  });
});

/* =======================================================
   STAFF: UPDATE MEMBER
======================================================= */
app.post("/api/updateMember", (req, res) => {
  const {
    identifier, fullName, email, phone,
    address, status, expiration, role, balance
  } = req.body;

  const sql = `
    UPDATE users SET
      fullName=?, email=?, phone=?, address=?,
      membershipStatus=?, membershipExpiration=?,
      role=?, balance=?
    WHERE username=? OR membershipID=?
  `;

  db.query(
    sql,
    [
      fullName, email, phone, address,
      status, expiration, role, balance,
      identifier, identifier
    ],
    (err) => {
      if (err) return res.json({ success: false });
      return res.json({ success: true });
    }
  );
});

/* =======================================================
   STAFF: LOOKUP BOOK
======================================================= */
app.get("/api/getBook", (req, res) => {
  const { isbn } = req.query;

  db.query("SELECT * FROM books WHERE isbn=?", [isbn], (err, rows) => {
    if (err || rows.length === 0)
      return res.json({ success: false });

    return res.json({ success: true, book: rows[0] });
  });
});

/* =======================================================
   STAFF: ADD / UPDATE BOOK
======================================================= */
app.post("/api/saveBook", (req, res) => {
  const { title, author, isbn, description, cover } = req.body;

  const sql = `
    INSERT INTO books (title, author, isbn, description, cover)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      title=VALUES(title),
      author=VALUES(author),
      description=VALUES(description),
      cover=VALUES(cover)
  `;

  db.query(sql, [title, author, isbn, description, cover], (err) => {
    if (err) return res.json({ success: false });
    return res.json({ success: true });
  });
});

/* =======================================================
   START SERVER (PORT 80 FOR GCP)
======================================================= */
app.listen(80, () => {
  console.log("✔ Server running on port 80 (GCP VM)");
});
