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

app.get("/states/", async (request, response) => {
  const authHeader = request.headers["authorization"];
  let jwtToken;
  if (authHeader) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (!jwtToken) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    JWT.verify(jwtToken, "Rob_D_Lucci", async (error, payload) => {
      if (error) {
        response.status(401).json("Invalid JWT Token");
      } else {
        const query = `
            SELECT
              *
            FROM
             state;`;
        const res = await db.all(query);
        response.send(res);
      }
    });
  }
});

module.exports = app;
