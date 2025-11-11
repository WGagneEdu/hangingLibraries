import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

// handle json/form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// serve all files in this folder
app.use(express.static(__dirname));

// main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "HomePage.html"));
});

// search backend
app.post("/api/search", (req, res) => {
  const { query } = req.body;
  console.log("Search request:", query);

  // go to results page even before backend is ready
  res.redirect("/resultPage.html");
});

// browse backend
app.get("/api/browse", (req, res) => {
  console.log("Browse request");

  res.json({
    success: true,
    items: []
  });
});

// edit profile backend
app.post("/api/editProfile", (req, res) => {
  const { username, password, preferences } = req.body;
  console.log("Profile update:", { username, password, preferences });

  res.json({
    success: true
  });
});

// results backend
app.get("/api/results", (req, res) => {
  console.log("Results request");

  res.json({
    success: true,
    data: []
  });
});

const PORT = 80;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
