const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const results = [
  {
    match: "Liverpool vs Galatasaray",
    competition: "Champions League",
    top1: "3-1",
    top2: "3-0",
    top3: "4-1",
    recommended: "3-1",
    profile: "Match ouvert",
    reliability: 79,
    color1: "green",
    color2: "violet",
    color3: "red"
  },
  {
    match: "Barcelona vs Newcastle",
    competition: "Europe",
    top1: "3-1",
    top2: "2-1",
    top3: "3-2",
    recommended: "3-1",
    profile: "Home fort",
    reliability: 79,
    color1: "green",
    color2: "violet",
    color3: "red"
  }
];

app.get("/", (req, res) => {
  res.send("API MR GOAT LIVE");
});

app.get("/results", (req, res) => {
  res.json(results);
});

app.get("/search", (req, res) => {
  const q = String(req.query.q || "").toLowerCase().trim();

  if (!q) {
    return res.json([]);
  }

  const filtered = results.filter((item) =>
    item.match.toLowerCase().includes(q)
  );

  res.json(filtered);
});

app.post("/analyze", (req, res) => {
  const match = String(req.body.match || "").trim();

  if (!match) {
    return res.status(400).json({ error: "match required" });
  }

  const found = results.find(
    (item) => item.match.toLowerCase() === match.toLowerCase()
  );

  if (found) {
    return res.json(found);
  }

  return res.json({
    match: match,
    competition: "Unknown",
    top1: "2-1",
    top2: "1-1",
    top3: "2-0",
    recommended: "2-1",
    profile: "Auto analyse",
    reliability: 60,
    color1: "green",
    color2: "violet",
    color3: "red"
  });
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
