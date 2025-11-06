import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve ALL files in this directory, including .html
app.use(express.static(__dirname));

// Default route → homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "homePage.html"));
});

const PORT = 80;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
