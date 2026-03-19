const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());

const API_KEY = "ATAOVY_EO_ILAY_FOOTBALL_DATA_KEY_NAO";
const PORT = process.env.PORT || 3000;

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function buildPrediction(match) {
  const home = match.homeTeam?.name || "Home";
  const away = match.awayTeam?.name || "Away";

  // Placeholder intelligent kely aloha
  // mbola tsy bookmaker/machine final io
  let top1 = "2-1";
  let top2 = "1-0";
  let top3 = "2-0";
  let recommended = "2-1";
  let reliability = 68;
  let profile = "Balanced match";

  if (home.toLowerCase().includes("liverpool")) {
    top1 = "3-1";
    top2 = "3-0";
    top3 = "4-1";
    recommended = "3-1";
    reliability = 79;
    profile = "Match ouvert";
  }

  if (home.toLowerCase().includes("barcelona") || away.toLowerCase().includes("barcelona")) {
    top1 = "3-1";
    top2 = "2-1";
    top3 = "3-2";
    recommended = "3-1";
    reliability = 77;
    profile = "Home fort";
  }

  return {
    match: `${home} vs ${away}`,
    competition: match.competition?.name || "Unknown competition",
    utcDate: match.utcDate || null,
    status: match.status || "SCHEDULED",
    top1,
    top2,
    top3,
    recommended,
    reliability,
    profile,
    color1: "green",
    color2: "violet",
    color3: "red"
  };
}

async function getMatchesWindow() {
  const now = new Date();

  const past = new Date(now);
  past.setDate(now.getDate() - 3);

  const future = new Date(now);
  future.setDate(now.getDate() + 7);

  const url =
    `https://api.football-data.org/v4/matches` +
    `?dateFrom=${formatDate(past)}` +
    `&dateTo=${formatDate(future)}`;

  const response = await fetch(url, {
    headers: {
      "X-Auth-Token": API_KEY
    }
  });

  const data = await response.json();

  if (!data.matches || !Array.isArray(data.matches)) {
    return [];
  }

  return data.matches;
}

app.get("/", (req, res) => {
  res.send("MR GOAT REAL API LIVE");
});

app.get("/all", async (req, res) => {
  try {
    const matches = await getMatchesWindow();

    const formatted = matches
      .slice(0, 20)
      .map(buildPrediction);

    res.json(formatted);
  } catch (err) {
    res.status(500).json({
      error: "SERVER_ERROR",
      message: err.message
    });
  }
});

app.get("/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();

    if (!q) {
      return res.json([]);
    }

    const matches = await getMatchesWindow();

    const filtered = matches.filter(m => {
      const home = (m.homeTeam?.name || "").toLowerCase();
      const away = (m.awayTeam?.name || "").toLowerCase();
      const comp = (m.competition?.name || "").toLowerCase();

      return home.includes(q) || away.includes(q) || comp.includes(q);
    });

    const formatted = filtered
      .slice(0, 20)
      .map(buildPrediction);

    res.json(formatted);
  } catch (err) {
    res.status(500).json({
      error: "SERVER_ERROR",
      message: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
