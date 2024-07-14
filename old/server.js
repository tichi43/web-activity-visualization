const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

// create a new express app
const app = express();

// configure body parser to handle JSON data
app.use(bodyParser.json());

// connect to MongoDB database
mongoose.connect("mongodb://localhost:27017/user-activity-db");

// create a new mongoose schema for user activity data
const userActivitySchema = new mongoose.Schema({
  eventType: String,
  x: Number,
  y: Number,
  timeElapsed: Number
}, { timestamps: true });

// create a new mongoose model for user activity data
const UserActivity = mongoose.model("UserActivity", userActivitySchema);

// define a route to handle incoming user activity data
app.post("/api/collectData", (req, res) => {
  const data = req.body.data;
  console.log(data);
  if (!data) {
    return res.status(400).json({ message: "Invalid data format" });
  }
  // create new UserActivity instances from the collected data
  const userActivityInstances = data.map((item) => new UserActivity(item));
  // save the instances to the database

  UserActivity.insertMany(userActivityInstances).then((docs) => {
    console.log(`Saved ${docs.length} user activity instances to database`);
    return res.status(200).json({ message: "Data saved successfully" });
  }).catch((err) => {
    console.error(err);
    return res.status(500).json({ message: "Error saving data" });
  });
  
});


// start the server
app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
