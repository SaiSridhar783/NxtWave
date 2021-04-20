const express = require("express");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "cricketTeam.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (err) {
    console.log(`DB Error: ${err.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

app.get("/players/", async (request, response) => {
  const getPlayersList = `
    SELECT
      *
    FROM
      cricket_team
;`;
  const playersList = await db.all(getPlayersList);
  response.send(playersList);
});

app.post("/players/", async (request, response) => {
  const addPlayer = `
    INSERT INTO cricket_team(player_name, jersey_number, role)
    VALUES ("Vishal", 17, "Bowler");
    `;

  await db.run(addPlayer);
  response.send("Player Added to Team");
});

app.get("/players/:playerId", async (request, response) => {
  const { playerId } = request.params;
  console.log(request.params);
  const playerById = `
    SELECT * from cricket_team
    WHERE player_id=${playerId};
    `;

  const playerDetails = await db.get(playerById);
  response.send(playerDetails);
});
