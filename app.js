const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const format = require("date-fns/format");
const isValid = require("date-fns/isValid");

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

const priorityList = ["HIGH", "MEDIUM", "LOW", undefined];
const statusList = ["TO DO", "IN PROGRESS", "DONE", undefined];
const categoryList = ["WORK", "HOME", "LEARNING", undefined];

function validation(request, response, next) {
  const { status, priority, search_q, category } = request.query;
  if (!priorityList.includes(priority)) {
    return response.status(400).send("Invalid Todo Priority");
  } else if (!statusList.includes(status)) {
    return response.status(400).send("Invalid Todo Status");
  } else if (!categoryList.includes(category)) {
    return response.status(400).send("Invalid Todo Category");
  } else {
    next();
  }
}

function validationBody(request, response, next) {
  const { id, todo, priority, category, status, dueDate } = request.body;
  if (!priorityList.includes(priority)) {
    return response.status(400).send("Invalid Todo Priority");
  } else if (!statusList.includes(status)) {
    return response.status(400).send("Invalid Todo Status");
  } else if (!categoryList.includes(category)) {
    return response.status(400).send("Invalid Todo Category");
  } else if (!isValid(new Date(dueDate)) && dueDate !== undefined) {
    return response.status(400).send("Invalid Due Date");
  } else {
    next();
  }
}

function dbObjToJSON(arr) {
  return arr.map((item) => ({
    id: item.id,
    todo: item.todo,
    priority: item.priority,
    category: item.category,
    status: item.status,
    dueDate: item.due_date,
  }));
}

app.get("/todos/", validation, async (request, response) => {
  const { status, priority, search_q, category } = request.query;
  let query;
  let res;
  switch (true) {
    case status !== undefined && priority !== undefined:
      query = `
        SELECT * FROM todo WHERE status='${status}' AND priority='${priority}';
        `;
      res = await db.all(query);
      return response.send(dbObjToJSON(res));

    case status !== undefined && category !== undefined:
      query = `
          SELECT * FROM todo WHERE status='${status}' AND category='${category}';
          `;
      res = await db.all(query);
      return response.send(dbObjToJSON(res));

    case priority !== undefined && category !== undefined:
      query = `
          SELECT * FROM todo WHERE priority='${priority}' AND category='${category}';
          `;
      res = await db.all(query);
      return response.send(dbObjToJSON(res));

    case status !== undefined:
      query = `
          SELECT * FROM todo WHERE status='${status}';
          `;
      res = await db.all(query);
      return response.send(dbObjToJSON(res));

    case category !== undefined:
      query = `
          SELECT * FROM todo WHERE category='${category}';
          `;
      res = await db.all(query);
      return response.send(dbObjToJSON(res));

    case priority !== undefined:
      query = `
          SELECT * FROM todo WHERE priority='${priority}';
          `;
      res = await db.all(query);
      return response.send(dbObjToJSON(res));

    case search_q !== undefined:
      query = `
          SELECT * FROM todo WHERE todo LIKE '%${search_q}%';
          `;
      res = await db.all(query);
      return response.send(dbObjToJSON(res));

    default:
      return response.send("Please make a query");
  }
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const res = await db.all(`SELECT * FROM todo WHERE id=${todoId};`);
  response.send(dbObjToJSON(res)[0]);
});

app.get("/agenda/", async (request, response) => {
  let { date } = request.query;
  if (!date) {
    return response.status(400).send("Invalid Due Date");
  }

  const dateObj = new Date(date);

  if (!isValid(dateObj)) {
    return response.status(400).send("Invalid Due Date");
  }

  date = format(dateObj, "yyyy-MM-dd");

  const res = await db.all(`SELECT * FROM todo WHERE due_date='${date}';`);
  response.send(dbObjToJSON(res));
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  await db.run(`DELETE FROM todo WHERE id=${todoId};`);
  response.send("Todo Deleted");
});

app.post("/todos/", validationBody, async (request, response) => {
  const { id, todo, priority, category, status, dueDate } = request.body;
  await db.run(`INSERT INTO todo VALUES
                    (${id}, '${todo}', '${priority}',
                    '${category}', '${status}',
                    '${dueDate}');`);

  response.send("Todo Successfully Added");
});

app.put("/todos/:todoId/", validationBody, async (request, response) => {
  const { todoId } = request.params;
  const { status, priority, todo, category, dueDate } = request.body;
  const queryStatement = (row, field) => {
    return `UPDATE todo SET ${row}='${field}';`;
  };

  switch (true) {
    case status !== undefined:
      await db.run(queryStatement("status", status));
      return response.send("Status Updated");
    case priority !== undefined:
      await db.run(queryStatement("priority", priority));
      return response.send("Priority Updated");
    case todo !== undefined:
      await db.run(queryStatement("todo", todo));
      return response.send("Todo Updated");
    case category !== undefined:
      await db.run(queryStatement("category", category));
      return response.send("Category Updated");
    case dueDate !== undefined:
      date = format(new Date(dueDate), "yyyy-MM-dd");
      await db.run(`UPDATE todo SET due_date='${date}';`);
      return response.send("Due Date Updated");
  }
});

module.exports = app;
