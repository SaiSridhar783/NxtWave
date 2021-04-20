const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "moviesData.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
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

app.get("/movies/", async (request, response) => {
  const getAllMovies = `
    SELECT * from movie;
    `;
  const moviesData = await database.all(getAllMovies);
  const outputObj = moviesData.map((movie) => {
    return { movieName: movie.movie_name };
  });
  //console.log(outputObj);
  response.send(outputObj);
});

app.post("/movies/", async (request, response) => {
  const { directorId, movieName, leadActor } = request.body();
  const postMovie = `
    INSERT INTO movie(director_id, movie_name, lead_actor)
    VALUES (${directorId}, ${movieName}, ${leadActor});
    `;
  const posted = await database.run(postMovie);

  response.send("Movie Successfully Added");
});

app.get("/movies/:movieId", async (request, response) => {
  const { movieId } = request.params;
  const query = `
    SELECT * from movie WHERE movie_id=${movieId}; 
`;
  const movieDetail = await database.get(query);
  response.send({
    movieId,
    directorId: movieDetail.director_id,
    movieName: movieDetail.movie_name,
    leadActor: movieDetail.lead_actor,
  });
});

app.put("/movies/:movieId", async (request, response) => {
  const { movieId } = request.params;
  const { directorId, movieName, leadActor } = request.body;
  const query = `
    UPDATE movie
    SET
    directorId=${directorId},
    movie_name=${movieName},
    lead_actor=${leadActor} 
    WHERE movie_id=${movieId}; 
`;
  await database.run(query);
  response.send("Movie Details Updated");
});

app.delete("/movies/:movieId", async (request, response) => {
  const { movieId } = request.params;
  const query = `
    DELETE from movie
    WHERE movie_id=${movieId}; 
`;
  await database.run(query);
  response.send("Movie Removed");
});

app.get("/directors/", async (request, response) => {
  const getAllDirectors = `
    SELECT * from director;
    `;
  const moviesData = await database.all(getAllDirectors);
  const outputObj = moviesData.map((movie) => {
    return { directorId: movie.director_id, directorName: movie.director_name };
  });
  //console.log(outputObj);
  response.send(outputObj);
});

app.get("/directors/:directorId/movies/", async (request, response) => {
  const { directorId } = request.params;
  const query = `
    select movie_name from movie 
    WHERE movie.director_id=${directorId};
    `;

  const resp = await database.all(query);
  response.send(
    resp.map((dir) => {
      return {
        movieName: dir.movie_name,
      };
    })
  );
});

module.exports = app;
