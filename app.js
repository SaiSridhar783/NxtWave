const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");

const databasePath = path.join(__dirname, "userData.db");

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

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const newPass = await bcrypt.hash(password, 14);

  const checkUser = `SELECT * from user WHERE username='${username}'`;
  const exist = await db.get(checkUser);

  if (exist) {
    response.statusCode = 400;
    response.send("User already exists");
  } else if (password.length < 5) {
    response.statusCode = 400;
    response.send("Password is too short");
  } else {
    const query = `
      INSERT INTO user values ('${username}', '${name}', '${newPass}', '${gender}', '${location}');
      `;
    await db.run(query);
    response.statusCode = 200;
    response.send("User created successfully");
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const query = `
  SELECT * from user where username='${username}';
  `;
  const res = await db.get(query);

  if (!res) {
    response.statusCode = 400;
    response.send("Invalid user");
  } else {
    const pass = res.password;
    const correctPass = await bcrypt.compare(password, pass);
    if (correctPass) {
      response.statusCode = 200;
      response.send("Login success!");
    } else {
      response.statusCode = 400;
      response.send("Invalid password");
    }
  }
});

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const query = `
    SELECT * from user where username='${username}';
    `;
  const res = await db.get(query);
  const comparedResult = await bcrypt.compare(oldPassword, res.password);
  if (!comparedResult) {
    response.statusCode = 400;
    response.send("Invalid current password");
  } else {
    if (newPassword.length < 5) {
      response.statusCode = 400;
      response.send("Password is too short");
    } else {
      const newPassCoded = await bcrypt.hash(newPassword, 14);
      const updateQuery = `
          UPDATE user SET password='${newPassCoded}'
          WHERE username='${username}';
          `;
      await db.run(updateQuery);
      response.send("Password updated");
    }
  }
});

module.exports = app;
