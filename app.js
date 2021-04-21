const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "covid19India.db");

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
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

// Get all Data from the table *state*

app.get("/states/", async (request, response) => {
  const query = `
    SELECT * from state;
    `;

  const allStates = await db.all(query);
  response.send(
    allStates.map((each) => ({
      stateId: each.state_id,
      stateName: each.state_name,
      population: each.population,
    }))
  );
});

// Get details of state by ID

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const query = `
    SELECT * from state where state_id=${stateId};
    `;
  const stateDetail = await db.get(query);
  response.send({
    stateId: stateDetail.state_id,
    stateName: stateDetail.state_name,
    population: stateDetail.population,
  });
});

// Add data to the distinct table

app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const query = `
  INSERT into district(districtName, stateId, cases, cured, active, deaths) 
  VALUES ( ${districtName}, ${stateId}, ${cases}, ${cured}, ${active}, ${deaths});
    `;

  await db.run(query);
  response.send("District Successfully Added");
});

// Get data from district table by ID

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const query = `
    SELECT * from district where district_id=${districtId};
    `;
  const posted = await db.get(query);
  response.send({
    districtId: posted.district_id,
    districtName: posted.district_name,
    stateId: posted.state_id,
    cases: posted.cases,
    cured: posted.cured,
    active: posted.active,
    deaths: posted.deaths,
  });
});

// Delete from district table

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const query = `
    DELETE from district where district_id=${districtId}
    `;
  await db.run(query);
  response.send("District Removed");
});

// Update district by ID

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const query = `
    UPDATE district SET
        district_name=${districtName},
        state_id= ${stateId},
        cases= ${cases},
        cured= ${cured},
        active= ${active},
        deaths= ${deaths}
    
    WHERE district_id=${districtId}
    `;

  await db.run(query);
  response.send("District Details Updated");
});

// Get stats of state by ID

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const query = `
  SELECT
    sum(cases) as tot_cases,
    sum(cured) as tot_cured,
    sum(active) as tot_active,
    sum(deaths) as tot_deaths
  FROM district
  GROUP BY state_id;
  `;
  const stateStat = await db.get(query);
  response.send({
    totalCases: stateStat.tot_cases,
    totalCured: stateStat.tot_cured,
    totalActive: stateStat.tot_active,
    totalDeaths: stateStat.tot_deaths,
  });
});

// Details of District

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const query = `
  SELECT state_name from
  state INNER JOIN district ON
  state.state_id = district.state_id
  WHERE district.district_id = ${districtId};
  `;
  const distDetails = await db.get(query);
  response.send({
    stateName: distDetails.state_name,
  });
});

module.exports = app;
