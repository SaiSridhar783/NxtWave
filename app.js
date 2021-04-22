const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "cricketMatchDetails.db");

const app = express();

app.use(express.json());

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

app.get("/players/", async (request, response) => {
  const query = `
    SELECT * from player_details;
    `;
  const res = await db.all(query);
  response.send(
    res.map((item) => ({
      playerId: item.player_id,
      playerName: item.player_name,
    }))
  );
});

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const query = `
    SELECT * from player_details
    WHERE player_id=${playerId};
    `;
  const res = await db.get(query);
  response.send({
    playerId: res.player_id,
    playerName: res.player_name,
  });
});

app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const query = `
    UPDATE player_details
    SET player_name=${playerName}
    WHERE player_id=${playerId};
    `;
  await db.run(query);
  response.send("Player Details Updated");
});

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const query = `
    SELECT * from match_details
    WHERE match_id=${matchId};
    `;
  const res = await db.get(query);
  response.send({
    matchId: matchId,
    match: res.match,
    year: res.year,
  });
});

app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const query = `
    SELECT * from match_details INNER JOIN player_match_score 
    ON match_details.match_id=player_match_score.match_id
    WHERE player_id=${playerId};
    `;
  const res = await db.all(query);
  response.send(
    res.map((item) => ({
      matchId: item.match_id,
      match: item.match,
      year: item.year,
    }))
  );
});

app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const query = `
    SELECT * from player_details INNER JOIN player_match_score 
    ON player_details.player_id=player_match_score.player_id
    WHERE match_id=${matchId};
    `;
  const res = await db.all(query);
  response.send(
    res.map((item) => ({
      playerId: item.player_id,
      playerName: item.player_name,
    }))
  );
});

app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const query = `
    SELECT player_details.player_id as player_id, player_details.player_name as player_name,
    sum(score) as total_score, sum(fours) as total_fours, sum(sixes) as total_sixes
    FROM player_details INNER JOIN player_match_score 
    ON player_details.player_id=player_match_score.player_id
    WHERE player_details.player_id=${playerId}
    GROUP BY player_details.player_id;
    `;
  const res = await db.get(query);
  //console.log(res);
  response.send({
    playerId: res.player_id,
    playerName: res.player_name,
    totalScore: res.total_score,
    totalFours: res.total_fours,
    totalSixes: res.total_sixes,
  });
});

module.exports = app;
