const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

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
  res.send("MR GOAT API OK");
});

app.get("/results", (req, res) => {
  res.json(results);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Server started");
});
