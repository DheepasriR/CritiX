const express = require("express"); // for creating an express app
const mysql = require("mysql2");
const bodyParser = require("body-parser"); // for parsing incomming form data
const session = require("express-session"); // for managing user sessions
const path = require("path"); // for fetching static files and managing file paths

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// for saving sessions using encryption only when needed
app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
  })
);

// for fetching files from public directory
app.use(express.static(path.join(__dirname, "public")));

// for connecting the database to a local mysql databse
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "CritiX",
});

db.connect((err) => {
  if (err) throw err;
  console.log("Database connected");
});

// Routes

// gets login/ register page
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "login.html"))
);

// app.get("/register", (req, res) =>
//   res.sendFile(path.join(__dirname, "views", "register.html"))
// );

// gets home page
app.get("/home", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "home.html"))
);

// gets the movie page with specifc id for that movie
app.get("/movie/:id", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "movie.html"))
);

// for retriving all movies from the database
app.get("/api/movies", (req, res) => {
  const query =
    "SELECT * FROM movies WHERE category IN ('Action', 'Comedy', 'Animation', 'Romance', 'Disney')";

  db.query(query, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

// for retriving the specific movie with specific id
app.get("/api/movies/:id", (req, res) => {
  const movieId = req.params.id;
  db.query("SELECT * FROM movies WHERE id = ?", [movieId], (err, results) => {
    if (err) throw err;
    if (results.length > 0) {
      res.json(results[0]);
    } else {
      res.status(404).send("Movie not found");
    }
  });
});

// for destroying the user session and redirects to login/register page
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).send("Failed to log out.");
    }
    res.redirect("/");
  });
});

// login and registration functionality

// checks the username and password entered in the database,
// if matches erdirects to home page, else error displayed
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  db.query(
    "SELECT * FROM users WHERE username = ? AND password = ?",
    [username, password],
    (err, results) => {
      if (err) throw err;
      if (results.length > 0) {
        req.session.userId = results[0].id;
        res.redirect("/home");
      } else {
        res.send("Invalid credentials");
      }
    }
  );
});

// add a new user into the database and redirects to login route
app.post("/register", (req, res) => {
  const { username, password } = req.body;
  db.query(
    "INSERT INTO users (username, password) VALUES (?, ?)",
    [username, password],
    (err) => {
      if (err) throw err;
      res.redirect("/");
    }
  );
});

// fetches the review for specific movie by using movie id
app.get("/api/reviews/:movieId", (req, res) => {
  const mrId = req.params.movieId;
  db.query(
    "SELECT reviews.*, users.username FROM reviews JOIN users ON reviews.user_id = users.id WHERE movie_id = ?",
    [mrId],
    (err, results) => {
      if (err) throw err;
      res.json(results);
    }
  );
});

// adds a review for specifc movie after checking if the user session is valid
app.post("/api/reviews", (req, res) => {
  const { movieId, comment, rating } = req.body;
  const userId = req.session.userId;
  if (!userId) return res.status(401).send("Unauthorized");

  db.query(
    "INSERT INTO reviews (user_id, movie_id, comment, rating) VALUES (?, ?, ?, ?)",
    [userId, movieId, comment, rating],
    (err) => {
      if (err) throw err;
      res.redirect(`/movie/${movieId}`);
    }
  );
});

// for staring the server at post 3000
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
