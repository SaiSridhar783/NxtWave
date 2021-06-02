const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const databasePath = path.join(__dirname, "twitterClone.db");

const app = express();

app.use(express.json());

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3003, () =>
      console.log("Server Running at http://localhost:3003/")
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
    jwt.verify(jwtToken, "Rob_D_Lucci", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

app.post("/register/", async (req, response) => {
  const { username, password, name, gender } = req.body;

  const encPass = await bcrypt.hash(password, 14);

  const userCheck = await db.get(
    `SELECT * from user where username='${username}';`
  );

  const insertQuery = `
                    INSERT INTO user(username, password, name, gender)
                        VALUES
                    ('${username}','${encPass}','${name}','${gender}')
                        `;

  if (userCheck) {
    response.status(400).json("User already exists");
  } else {
    const passCheck = password.length < 6;
    if (passCheck) {
      response.status(400).json("Password is too short");
    } else {
      await db.run(insertQuery);
      response.status(200).json("User created successfully");
    }
  }
});

app.post("/login/", async (req, response) => {
  const { username, password } = req.body;

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
      const jwtToken = jwt.sign(payload, "Abbachio");
      response.send({ jwtToken });
    }
  }
});

app.get();
