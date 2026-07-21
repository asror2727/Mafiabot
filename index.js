require("dotenv").config();

const express = require("express");
const connectDB = require("./config/db");

const app = express();

app.use(express.json());

// MongoDB ulash
connectDB();

app.get("/", (req, res) => {

  res.json({
    ok: true,
    message: "Mafia Engine Online 🚀"
  });

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log("Server Started : " + PORT);

});
