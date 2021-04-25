const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const JWT = require("jsonwebtoken");

const databasePath = path.join(__dirname, "covid19IndiaPortal.db");

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

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    JWT.verify(jwtToken, "Rob_D_Lucci", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const userCheck = await db.get(
    `SELECT * from user where username='${username}';`
  );
  if (!userCheck) {
    response.status(400).json("Invalid user");
  } else {
    const passCheck = await bcrypt.compare(password, userCheck.password);
    if (!passCheck) {
      response.status(400).json("Invalid password");
    } else {
      const payload = { username };
      const jwtToken = JWT.sign(payload, "Rob_D_Lucci");
      response.send({ jwtToken });
    }
  }
});

app.get("/states/", authenticateToken, async (request, response) => {
  const query = `
    SELECT
        *
    FROM
        state;`;
  const res = await db.all(query);
  response.send(
    res.map((item) => ({
      stateId: item.state_id,
      stateName: item.state_name,
      population: item.population,
    }))
  );
});

app.get("/states/:stateId", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const query = `
      SELECT
        *
      FROM
        state
      WHERE
        state_id=${stateId};
    `;
  const res = await db.get(query);
  response.send(res);
});

app.post("/districts/", authenticateToken, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const query = `
    INSERT 
        into district (district_name, state_id, cases, cured, active, deaths)
    VALUES
    (
        '${districtName}',
        ${stateId},
        ${cases},
        ${cured},
        ${active},
        ${deaths}
    );

    `;

  await db.run(query);
  response.send("District Successfully Added");
});

app.get(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const res = await db.get(
      `SELECT * FROM district where district_id='${districtId}';`
    );
    response.send(res);
  }
);

app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    await db.run(`DELETE FROM district where district_id='${districtId}';`);
    response.send("District Removed");
  }
);

app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;

    await db.run(`
  UPDATE 
    district 
  SET
    district_name='${districtName}',
    state_id=${stateId},
    cases=${cases},
    cured=${cured},
    active=${active},
    deaths=${deaths}
  WHERE district_id='${districtId}';`);
    response.send("District Details Updated");
  }
);

app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;
    const getStateStatsQuery = `
    SELECT
      SUM(cases),
      SUM(cured),
      SUM(active),
      SUM(deaths)
    FROM
      district
    WHERE
      state_id=${stateId};`;
    const stats = await database.get(getStateStatsQuery);
    response.send({
      totalCases: stats["SUM(cases)"],
      totalCured: stats["SUM(cured)"],
      totalActive: stats["SUM(active)"],
      totalDeaths: stats["SUM(deaths)"],
    });
  }
);

module.exports = app;
