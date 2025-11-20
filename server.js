import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

// Parse JSON / form bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Resolve directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve all HTML, images, CSS, JS from same folder
app.use(express.static(__dirname));

/* =======================================================
   LOGIN + SIMPLE AUTH (placeholder until real DB)
======================================================= */

// Fake login check
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  console.log("Login attempt:", username);

  // STAFF login
  if (username === "admin" && password === "password") {
    return res.json({ success: true, role: "staff" });
  }

  // MEMBER login
  if (username === "user" && password === "password") {
    return res.json({ success: true, role: "member" });
  }

  res.json({ success: false });
});

/* =======================================================
   PROTECTED PAGES
======================================================= */

app.get("/EditProfile.html", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

app.get("/StaffPage.html", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

app.get("/ManageCatalog.html", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

app.get("/ModifyMember.html", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

app.get("/CheckoutsList.html", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

/* =======================================================
   HOME PAGE
======================================================= */

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "HomePage.html"));
});

/* =======================================================
   SEARCH BACKEND (Redirect to ResultsPage)
======================================================= */

app.post("/api/search", (req, res) => {
  const { query } = req.body;
  console.log("Search:", query);

  res.redirect(`/ResultPage.html?query=${encodeURIComponent(query)}`);
});

/* =======================================================
   BROWSE BACKEND
======================================================= */

app.get("/api/browse", (req, res) => {
  console.log("Browse request");

  res.json({
    success: true,
    items: []
  });
});

/* =======================================================
   EDIT PROFILE BACKEND
======================================================= */

app.post("/api/editProfile", (req, res) => {
  const { username, password, preferences } = req.body;

  console.log("Profile updated:", { username, password, preferences });

  res.json({ success: true });
});

/* =======================================================
   RESULTS BACKEND
======================================================= */

app.get("/api/results", (req, res) => {
  console.log("Results requested");

  res.json({
    success: true,
    data: []
  });
});

/* =======================================================
   START SERVER
======================================================= */

const PORT = 80;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
