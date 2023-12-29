const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

const mySecret = process.env["MONGO_URL"];
const mongoose = require("mongoose");
const { Schema } = mongoose;
mongoose.connect(mySecret, { useNewUrlParser: true, useUnifiedTopology: true });
const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
  },
});

const User = mongoose.model("User", UserSchema);

const ExerciseSchema = new Schema({
  userId: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});
const Exercise = mongoose.model("Exercise", ExerciseSchema);

app.use(cors());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/api/users", async (req, res) => {
  const users = await User.find({}).select("username _id");
  if (users) {
    res.json(users);
  } else {
    res.json({ error: "No users found" });
  }
});
app.post("/api/users", async (req, res) => {
  const userObj = new User({
    username: req.body.username,
  });

  try {
    const user = await userObj.save();
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;
  try {
    const user = await User.findById(id);
    if (!user) {
      res.send("Unknown userId");
    } else {
      const exercise = new Exercise({
        userId: id,
        description,
        duration,
        date: date ? new Date(date) : new Date(),
      });
      const data = await exercise.save();
      res.json({
        _id: user._id,
        username: user.username,
        description: data.description,
        duration: data.duration,
        date: new Date(data.date).toDateString(),
      });
    }
  } catch (err) {
    console.log(err);
    res.send("Unknown userId");
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;
  const id = req.params._id;
  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({ error: "Unknown userId" });
  }

  let dateObj = {};

  if (from) {
    dateObj["$gte"] = new Date(from);
  }

  if (to) {
    dateObj["$lte"] = new Date(to);
  }

  let filter = {
    userId: id,
  };

  if (from || to) {
    filter.date = dateObj;
  }

  try {
    const exercises = await Exercise.find(filter).limit(+limit || 500);
    const log = exercises.map((exercise) => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    }));

    res.json({
      _id: user._id,
      username: user.username,
      count: log.length,
      log: log,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
