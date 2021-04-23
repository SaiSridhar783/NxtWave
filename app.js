const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "todoApplication.db");

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

app.get("/todos/", async (request, response) => {
  const { status, priority, search_q } = request.query;
  let query;

  if (status && priority) {
    query = `
            SELECT * from todo WHERE status='${status}' and priority='${priority}' ;
        `;
  } else if (status) {
    query = `
            SELECT * from todo WHERE status='${status}' ;
        `;
  } else if (priority) {
    query = `
            SELECT * from todo WHERE priority='${priority}' ;
        `;
  } else if (search_q) {
    query = `
            SELECT * from todo WHERE todo like '%${search_q}%';
        `;
  } else {
    query = `SELECT * from todo;`;
  }
  const res = await db.all(query);
  response.send(res.map((item) => item));
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const query = `
    SELECT * from todo WHERE id=${todoId};
    `;
  const res = await db.get(query);
  response.send(res);
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status } = request.body;
  const query = `
  INSERT into todo(id,todo,priority,status) VALUES (${id}, '${todo}', '${priority}', '${status}');
  `;
  await db.run(query);
  response.send("Todo Successfully Added");
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const query = `
    DELETE from todo where id=${todoId};
    `;
  await db.run(query);
  response.send("Todo Deleted");
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const { status, priority, todo } = request.body;
  let query = `UPDATE todo SET `;

  if (status) {
    query += `status='${status}';`;
    await db.run(query);
    response.send("Status Updated");
  } else if (priority) {
    query += `priority='${priority}';`;
    await db.run(query);
    response.send("Priority Updated");
  } else if (todo) {
    query += `todo='${todo}';`;
    await db.run(query);
    response.send("Todo Updated");
  }
});

module.exports = app;
