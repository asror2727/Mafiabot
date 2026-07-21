const express = require("express");

const app = express();

app.use(express.json());

const games = {};

// Test
app.get("/", (req, res) => {
  res.send("✅ Mafia Engine Online");
});

// Game yaratish
app.post("/game/start", (req, res) => {

  const chatId = req.body.chat_id;

  if (!chatId) {
    return res.json({
      ok: false,
      error: "chat_id required"
    });
  }

  if (games[chatId]) {
    return res.json({
      ok: false,
      error: "Game already exists"
    });
  }

  games[chatId] = {
    status: "WAITING",
    players: [],
    started: Date.now(),
    timer: 120
  };

  console.log("Game:", chatId);

  res.json({
    ok: true
  });

});

// Game olish
app.get("/game/:id", (req,res)=>{

const game = games[req.params.id];

if(!game){

return res.json({
ok:false
});

}

res.json(game);

});

app.listen(process.env.PORT || 3000,()=>{

console.log("Mafia Engine Started");

});
