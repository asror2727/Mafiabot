const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: String,

  money: { type: Number, default: 0 },
  diamond: { type: Number, default: 0 },
  energy: { type: Number, default: 0 },

  shield: { type: Number, default: 0 },
  kill: { type: Number, default: 0 },
  vote: { type: Number, default: 0 },
  gun: { type: Number, default: 0 },
  mask: { type: Number, default: 0 },
  doc: { type: Number, default: 0 },

  win: { type: Number, default: 0 },
  games: { type: Number, default: 0 },
  xp: { type: Number, default: 0 },

  shieldOn: { type: Boolean, default: false },
  killOn: { type: Boolean, default: false },
  voteOn: { type: Boolean, default: false },
  gunOn: { type: Boolean, default: false },
  maskOn: { type: Boolean, default: false },
  docOn: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);

async function getOrCreateUser(id, name) {
  let u = await User.findOne({ id: String(id) });
  if (!u) {
    u = await User.create({ id: String(id), name });
  } else if (name && u.name !== name) {
    u.name = name;
    await u.save();
  }
  return u;
}

async function addStat(id, field, amount) {
  await User.updateOne({ id: String(id) }, { $inc: { [field]: amount } }, { upsert: true });
}

module.exports = { User, getOrCreateUser, addStat };
