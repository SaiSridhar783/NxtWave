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
    jwt.verify(jwtToken, "Abbachio", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        x = jwt.decode(jwtToken, "Abbachio");
        request.body.username = x.username;
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
    response.status(400).send("User already exists");
  } else {
    const passCheck = password.length < 6;
    if (passCheck) {
      response.status(400).send("Password is too short");
    } else {
      await db.run(insertQuery);
      response.status(200).send("User created successfully");
    }
  }
});

app.post("/login/", async (req, response) => {
  const { username, password } = req.body;

  const userCheck = await db.get(
    `SELECT * from user where username='${username}';`
  );

  if (!userCheck) {
    response.status(400).send("Invalid user");
  } else {
    const passCheck = await bcrypt.compare(password, userCheck.password);
    if (!passCheck) {
      response.status(400).send("Invalid password");
    } else {
      const payload = { username };
      const jwtToken = jwt.sign(payload, "Abbachio");
      response.send({ jwtToken });
    }
  }
});

app.get("/user/tweets/feed/", authenticateToken, async (req, res) => {
  const username = req.body.username;

  const query = `
        SELECT DISTINCT follower.following_user_id
            FROM
        (user INNER JOIN follower
            ON
        user.user_id = follower.follower_user_id) as t1
            WHERE
        username = '${username}';
    `;
  const result1 = await db.all(query);
  let arr = result1.map((item) => item.following_user_id);

  const query2 = `
        SELECT username, tweet, date_time as dateTime
            FROM
        user INNER JOIN tweet ON
        user.user_id = tweet.user_id
            WHERE
        user.user_id IN (${arr.join(",")})
            ORDER BY dateTime DESC
            LIMIT 4;
    `;

  const result2 = await db.all(query2);
  res.status(200).json(result2);
});

app.get("/user/following/", authenticateToken, async (req, res) => {
  const username = req.body.username;

  const query = `
        SELECT follower.following_user_id
            FROM
        (user INNER JOIN follower
            ON
        user.user_id = follower.follower_user_id) as t1
            WHERE
        username = '${username}';
    `;
  const result1 = await db.all(query);
  let arr = result1.map((item) => item.following_user_id);
  arr = [...new Set(arr)];

  const query2 = `
        SELECT name FROM user WHERE user_id IN (${arr.join(",")});
    `;

  const result2 = await db.all(query2);
  res.status(200).json(result2);
});

app.get("/user/followers/", authenticateToken, async (req, res) => {
  const username = req.body.username;

  const query = `
        SELECT DISTINCT follower.follower_user_id
            FROM
        (user INNER JOIN follower
            ON
        user.user_id = follower.following_user_id) as t1
            WHERE
        username = '${username}';
    `;
  const result1 = await db.all(query);
  let arr = result1.map((item) => item.follower_user_id);
  //arr = [...new Set(arr)];

  const query2 = `
        SELECT name FROM user WHERE user_id IN (${arr.join(",")});
    `;

  const result2 = await db.all(query2);
  res.status(200).json(result2);
});

app.get("/tweets/:tweetId/", authenticateToken, async (req, res) => {
  const username = req.body.username;
  const { tweetId } = req.params;

  const query = `
        SELECT DISTINCT follower.following_user_id
            FROM
        (user INNER JOIN follower
            ON
        user.user_id = follower.follower_user_id) as t1
            WHERE
        username = '${username}';
    `;
  const result1 = await db.all(query);
  let arr = result1.map((item) => item.following_user_id);
  const x = arr.join(",");

  const query2 = `
        SELECT tweet, count(DISTINCT like_id) as likes, count(DISTINCT reply_id) as replies, tweet.date_time as dateTime
            FROM tweet INNER JOIN like ON tweet.tweet_id = like.tweet_id INNER JOIN reply ON
            like.tweet_id = reply.tweet_id
            WHERE tweet.tweet_id=${tweetId} AND tweet.user_id IN (${x});
    `;

  const result2 = await db.get(query2);

  if (result2.tweet === null) {
    res.status(401).send("Invalid Request");
  } else {
    res.status(200).send(result2);
  }
});

app.get("/tweets/:tweetId/likes/", authenticateToken, async (req, res) => {
  const username = req.body.username;
  const { tweetId } = req.params;

  const query = `
        SELECT DISTINCT follower.following_user_id
            FROM
        (user INNER JOIN follower
            ON
        user.user_id = follower.follower_user_id) as t1
            WHERE
        username = '${username}';
    `;
  const result1 = await db.all(query);
  let arr = result1.map((item) => item.following_user_id);
  const x = arr.join(",");

  const query2 = `
        SELECT like.user_id FROM like INNER JOIN 
        tweet ON tweet.tweet_id = like.tweet_id WHERE tweet.tweet_id=${tweetId} 
        AND tweet.user_id IN (${x});
    `;

  const result2 = await db.all(query2);

  if (result2.length === 0) {
    res.status(401).send("Invalid Request");
    return;
  }

  const arr2 = result2.map((item) => item.user_id);
  const query3 = `SELECT name FROM user WHERE user_id IN (${arr2.join(",")});`;

  const result3 = await db.all(query3);
  res.status(200).send({ likes: result3.map((item) => item.name) });
});

app.get("/tweets/:tweetId/replies/", authenticateToken, async (req, res) => {
  const username = req.body.username;
  const { tweetId } = req.params;

  const query = `
        SELECT DISTINCT follower.following_user_id
            FROM
        (user INNER JOIN follower
            ON
        user.user_id = follower.follower_user_id) as t1
            WHERE
        username = '${username}';
    `;
  const result1 = await db.all(query);
  let arr = result1.map((item) => item.following_user_id);
  const x = arr.join(",");

  const query2 = `
        SELECT user.name, reply.reply FROM reply INNER JOIN 
        tweet ON tweet.tweet_id = reply.tweet_id INNER JOIN user
        ON user.user_id = reply.user_id WHERE tweet.tweet_id=${tweetId} 
        AND tweet.user_id IN (${x});
    `;

  const result2 = await db.all(query2);

  if (result2.length === 0) {
    res.status(401).send("Invalid Request");
    return;
  }

  res.status(200).send({ replies: result2 });
});

module.exports = app;
