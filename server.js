const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({
    status: "online",
    name: "MAFIA ENGINE V3",
    version: "1.0.0",
    message: "Server is running successfully!"
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server started on port ${PORT}`);
});
