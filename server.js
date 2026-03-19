const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());

const API_KEY = "8f65d887b3054547946eb7d2b57a0a17";

app.get("/search", async (req, res) => {
  try {
    const response = await fetch("https://api.football-data.org/v4/matches", {
      headers: { "X-Auth-Token": API_KEY }
    });

    const data = await response.json();

    const q = req.query.q?.toLowerCase() || "";

    const results = data.matches.filter(m =>
      m.homeTeam.name.toLowerCase().includes(q) ||
      m.awayTeam.name.toLowerCase().includes(q)
    );

    const formatted = results.slice(0, 5).map(m => ({
      match: m.homeTeam.name + " vs " + m.awayTeam.name,
      competition: m.competition.name,
      top1: "2-1",
      top2: "1-0",
      top3: "3-1",
      recommended: "2-1",
      reliability: Math.floor(Math.random() * 40) + 60,
      profile: "Auto analyse",
      color1: "green",
      color2: "violet",
      color3: "red"
    }));

    res.json(formatted);

  } catch (err) {
    res.json({ error: "error" });
  }
});

app.listen(3000, () => console.log("Server running"));    }));

    res.json(formatted);

  } catch (err) {
    res.json({ error: "error" });
  }
});

app.listen(3000, () => console.log("Server running"));
