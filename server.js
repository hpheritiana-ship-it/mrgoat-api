const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());

// KEYS
const FOOTBALL_API_KEY = "8f65d887b3054547946eb7d2b57a0a17";
const ODDS_API_KEY = "1f30422bfc883864ffa4e4c29dfc83f13f1";
const RAPID_API_KEY = "ba43f41a47mshf8b8b082d77b254p1c16e6jsn59f32a041a97";
const RAPID_API_HOST = "free-football-api-data.p.rapidapi.com";

const PORT = process.env.PORT || 3000;

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(fc|cf|sc|ac|sk|club|de|the)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function sameTeams(aHome, aAway, bHome, bAway) {
  const ah = normalizeName(aHome);
  const aa = normalizeName(aAway);
  const bh = normalizeName(bHome);
  const ba = normalizeName(bAway);

  return (
    ((ah.includes(bh) || bh.includes(ah)) && (aa.includes(ba) || ba.includes(aa))) ||
    ((ah.includes(ba) || ba.includes(ah)) && (aa.includes(bh) || bh.includes(aa)))
  );
}

function extractH2H(oddsEvent, homeTeam, awayTeam) {
  if (
    !oddsEvent ||
    !Array.isArray(oddsEvent.bookmakers) ||
    oddsEvent.bookmakers.length === 0
  ) {
    return null;
  }

  const bookmaker = oddsEvent.bookmakers[0];
  const market = (bookmaker.markets || []).find((m) => m.key === "h2h");
  if (!market) return null;

  let homeOdd = null;
  let awayOdd = null;
  let drawOdd = null;

  for (const outcome of market.outcomes || []) {
    const name = String(outcome.name || "");
    const price = outcome.price;

    if (normalizeName(name) === normalizeName(homeTeam)) {
      homeOdd = price;
    } else if (normalizeName(name) === normalizeName(awayTeam)) {
      awayOdd = price;
    } else if (name.toLowerCase() === "draw") {
      drawOdd = price;
    }
  }

  if (homeOdd == null && awayOdd == null && drawOdd == null) {
    return null;
  }

  return {
    bookmaker: bookmaker.title || "Unknown",
    home: homeOdd,
    draw: drawOdd,
    away: awayOdd,
  };
}

function buildPrediction(match, oddsInfo) {
  const home = match.homeTeam?.name || "Home";
  const away = match.awayTeam?.name || "Away";

  let top1 = "1-1";
  let top2 = "1-0";
  let top3 = "0-1";
  let recommended = "1-1";
  let reliability = 58;
  let profile = "Match serré";

  if (oddsInfo && oddsInfo.home && oddsInfo.away) {
    const homeOdd = Number(oddsInfo.home);
    const awayOdd = Number(oddsInfo.away);
    const drawOdd = Number(oddsInfo.draw || 4.5);

    const sorted = [homeOdd, awayOdd, drawOdd].sort((a, b) => a - b);
    const gap = sorted[1] - sorted[0];

    reliability = Math.max(55, Math.min(88, Math.round(60 + gap * 12)));

    if (homeOdd < awayOdd && homeOdd < drawOdd) {
      top1 = "2-1";
      top2 = "2-0";
      top3 = "1-0";
      recommended = "2-1";
      profile = "Home fort";

      if (homeOdd <= 1.7) {
        top1 = "3-1";
        top2 = "2-0";
        top3 = "3-0";
        recommended = "3-1";
        reliability += 4;
      }
    } else if (awayOdd < homeOdd && awayOdd < drawOdd) {
      top1 = "1-2";
      top2 = "0-2";
      top3 = "0-1";
      recommended = "1-2";
      profile = "Away fort";

      if (awayOdd <= 1.7) {
        top1 = "1-3";
        top2 = "0-2";
        top3 = "0-3";
        recommended = "1-3";
        reliability += 4;
      }
    } else {
      top1 = "1-1";
      top2 = "0-0";
      top3 = "2-2";
      recommended = "1-1";
      profile = "Draw possible";
    }
  }

  reliability = Math.max(50, Math.min(90, reliability));

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
    color3: "red",
    odds: oddsInfo || null,
  };
}

// FOOTBALL-DATA MATCHES
async function getMatchesWindow() {
  const now = new Date();

  const today = new Date(now);
  const future = new Date(now);
  future.setDate(now.getDate() + 7);

  const url =
    `https://api.football-data.org/v4/matches` +
    `?dateFrom=${formatDate(today)}` +
    `&dateTo=${formatDate(future)}`;

  const response = await fetch(url, {
    headers: {
      "X-Auth-Token": FOOTBALL_API_KEY,
    },
  });

  const data = await response.json();
  return Array.isArray(data.matches) ? data.matches : [];
}

// THE ODDS API
async function getSoccerSportKeysFromOdds() {
  const response = await fetch(
    `https://api.the-odds-api.com/v4/sports/?apiKey=${ODDS_API_KEY}`
  );

  const sports = await response.json();
  if (!Array.isArray(sports)) return [];

  const wanted = [
    "Premier League",
    "Champions League",
    "Europa League",
    "La Liga",
    "Serie A",
    "Bundesliga",
    "Ligue 1",
    "MLS",
    "FA Cup",
    "EFL Championship",
  ];

  return sports
    .filter((s) => s.group === "Soccer" && s.active === true)
    .filter((s) => {
      const t = `${s.title || ""} ${s.description || ""}`.toLowerCase();
      return wanted.some((w) => t.includes(w.toLowerCase()));
    })
    .map((s) => s.key);
}

async function getOddsEvents() {
  const sportKeys = await getSoccerSportKeysFromOdds();
  const allEvents = [];

  for (const key of sportKeys) {
    try {
      const url =
        `https://api.the-odds-api.com/v4/sports/${key}/odds` +
        `?apiKey=${ODDS_API_KEY}` +
        `&regions=eu` +
        `&markets=h2h` +
        `&oddsFormat=decimal`;

      const response = await fetch(url);
      const events = await response.json();

      if (Array.isArray(events)) {
        allEvents.push(...events);
      }
    } catch (e) {
      // skip
    }
  }

  return allEvents;
}

function findMatchingOdds(match, oddsEvents) {
  const home = match.homeTeam?.name || "";
  const away = match.awayTeam?.name || "";

  const event = oddsEvents.find((ev) =>
    sameTeams(home, away, ev.home_team, ev.away_team)
  );

  if (!event) return null;
  return extractH2H(event, home, away);
}

// RAPIDAPI VERIFIED ENDPOINT FROM YOUR CURL
app.get("/event-stats", async (req, res) => {
  try {
    const eventid = req.query.eventid;
    if (!eventid) {
      return res.status(400).json({ error: "eventid is required" });
    }

    const response = await fetch(
      `https://${RAPID_API_HOST}/football-event-statistics?eventid=${encodeURIComponent(eventid)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key": RAPID_API_KEY,
          "X-RapidAPI-Host": RAPID_API_HOST,
        },
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({
      error: "RAPIDAPI_EVENT_STATS_ERROR",
      message: err.message,
    });
  }
});

app.get("/", (req, res) => {
  res.send("MR GOAT REAL API LIVE");
});

app.get("/all", async (req, res) => {
  try {
    const [matches, oddsEvents] = await Promise.all([
      getMatchesWindow(),
      getOddsEvents(),
    ]);

    const formatted = matches.slice(0, 20).map((match) => {
      const oddsInfo = findMatchingOdds(match, oddsEvents);
      return buildPrediction(match, oddsInfo);
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({
      error: "SERVER_ERROR",
      message: err.message,
    });
  }
});

app.get("/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();
    if (!q) return res.json([]);

    const words = q.split(/\s+/);

    const [matches, oddsEvents] = await Promise.all([
      getMatchesWindow(),
      getOddsEvents(),
    ]);

    const filtered = matches.filter((m) => {
      const home = (m.homeTeam?.name || "").toLowerCase();
      const away = (m.awayTeam?.name || "").toLowerCase();
      const comp = (m.competition?.name || "").toLowerCase();
      const haystack = `${home} ${away} ${comp}`;

      return words.every((w) => haystack.includes(w));
    });

    const formatted = filtered.slice(0, 20).map((match) => {
      const oddsInfo = findMatchingOdds(match, oddsEvents);
      return buildPrediction(match, oddsInfo);
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({
      error: "SERVER_ERROR",
      message: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
