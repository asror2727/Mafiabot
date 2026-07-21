const { roleInfo, roleTask, buildRoleList } = require('./roles');
const { addStat, User } = require('../models/User');

const CFG = {
  MIN_PLAYERS: 3,
  MAX_PLAYERS: 30,
  NIGHT_SEC: 45,
  VOTE_SEC: 45,
  LASTWORD_SEC: 30,
  EXTEND_SEC: 20
};

const games = new Map();
const activeChat = new Map();

function newGame(chatId, ownerId) {
  return {
    status: 'lobby',
    chatId: String(chatId),
    players: [],
    day: 0,
    ownerId: String(ownerId),
    messageId: null,
    votes: {},
    night: {},
    accused: null,
    createdAt: Date.now(),
    timer: null
  };
}

function alivePlayers(g) { return g.players.filter((p) => p.alive); }
function findPlayer(g, id) { return g.players.find((p) => p.id === String(id)); }

function majorityTarget(votesObj) {
  const counts = {};
  for (const voter in votesObj) {
    const t = votesObj[voter];
    counts[t] = (counts[t] || 0) + 1;
  }
  let best = null, bestCount = -1;
  for (const t in counts) if (counts[t] > bestCount) { best = t; bestCount = counts[t]; }
  return best;
}

function targetKeyboard(g, selfId, prefix) {
  const rows = [];
  for (const p of alivePlayers(g)) {
    if (p.id === String(selfId)) continue;
    rows.push([{ text: p.name, callback_data: prefix + p.id }]);
  }
  return { inline_keyboard: rows };
}

function lobbyText(g) {
  return `🎮 MAFIA O'YINI OCHILDI\n\n👥 ${g.players.length}/${CFG.MAX_PLAYERS}`;
}

function lobbyKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "➕ Qo'shilish", callback_data: 'mgo_join' }],
      [{ text: '▶️ Boshlash', callback_data: 'mgo_start' }, { text: '❌ Bekor qilish', callback_data: 'mgo_cancel' }]
    ]
  };
}

async function isAdmin(bot, chatId, userId) {
  try {
    const m = await bot.telegram.getChatMember(chatId, userId);
    return m.status === 'creator' || m.status === 'administrator';
  } catch (e) {
    return false;
  }
}

function scheduleTick(bot, chatId, seconds, phase) {
  const g = games.get(String(chatId));
  if (!g) return;
  if (g.timer) clearTimeout(g.timer);
  g.timer = setTimeout(() => tickPhase(bot, chatId, phase), seconds * 1000);
}

async function tickPhase(bot, chatId, expectedPhase) {
  const g = games.get(String(chatId));
  if (!g || g.status !== expectedPhase) return;

  if (expectedPhase === 'night') {
    const dead = resolveNight(bot, g);
    await startDay(bot, g, dead);
  } else if (expectedPhase === 'vote') {
    await finishVote(bot, g);
  } else if (expectedPhase === 'lastword') {
    await executeAccused(bot, g);
  }
}

// ---------------- LOBBY ----------------
async function handleGameOpen(bot, chat, user) {
  if (!(await isAdmin(bot, chat.id, user.id))) {
    return bot.telegram.sendMessage(chat.id, "❌ Faqat admin yoki owner o'yin ochishi mumkin!");
  }
  const existing = games.get(String(chat.id));
  if (existing && existing.status !== 'ended') {
    return bot.telegram.sendMessage(chat.id, '⚠️ Bu guruhda allaqachon faol o\'yin bor!');
  }

  const g = newGame(chat.id, user.id);
  games.set(String(chat.id), g);

  const sent = await bot.telegram.sendMessage(chat.id, lobbyText(g), { reply_markup: lobbyKeyboard() });
  g.messageId = sent.message_id;

  try { await bot.telegram.pinChatMessage(chat.id, g.messageId); } catch (e) {}
}

async function editLobby(bot, g) {
  try {
    await bot.telegram.editMessageText(g.chatId, g.messageId, undefined, lobbyText(g), { reply_markup: lobbyKeyboard() });
  } catch (e) {}
}

async function handleJoin(bot, ctx) {
  const chatId = String(ctx.chat.id);
  const g = games.get(chatId);
  if (!g || g.status !== 'lobby') return ctx.answerCbQuery("⚠️ Hozir qo'shilib bo'lmaydi.");

  const userId = String(ctx.from.id);
  if (findPlayer(g, userId)) return ctx.answerCbQuery('✅ Siz allaqachon qo\'shilgansiz!');
  if (g.players.length >= CFG.MAX_PLAYERS) return ctx.answerCbQuery("⚠️ O'yin to'lgan!");

  g.players.push({ id: userId, name: ctx.from.first_name, role: null, alive: true });
  activeChat.set(userId, chatId);

  await editLobby(bot, g);
  await ctx.answerCbQuery("✅ Siz o'yinga qo'shildingiz!");

  try {
    await bot.telegram.sendMessage(userId, "✅ Siz mafia o'yiniga qo'shildingiz!\nO'yin boshlanguncha kuting.");
  } catch (e) {}
}

async function handleStopGame(bot, _unused, chat, user, answer) {
  const g = games.get(String(chat.id));
  if (!g || g.status === 'ended') return answer('⚠️ Faol o\'yin yo\'q.');
  if (!(await isAdmin(bot, chat.id, user.id)) && String(user.id) !== g.ownerId) {
    return answer('❌ Faqat admin bekor qilishi mumkin!');
  }
  if (g.timer) clearTimeout(g.timer);
  for (const p of g.players) activeChat.delete(p.id);
  games.delete(String(chat.id));
  await bot.telegram.sendMessage(chat.id, "❌ O'yin bekor qilindi.");
}

async function handleExtendTime(bot, chat, answer) {
  const g = games.get(String(chat.id));
  if (!g) return answer('⚠️ Faol o\'yin yo\'q.');
  if (!['night', 'vote', 'lastword'].includes(g.status)) return answer("⏰ Hozir vaqtni cho'zib bo'lmaydi.");
  await bot.telegram.sendMessage(chat.id, `⏰ Vaqt +${CFG.EXTEND_SEC} soniyaga uzaytirildi!`);
  scheduleTick(bot, chat.id, CFG.EXTEND_SEC, g.status);
}

// ---------------- START GAME ----------------
async function sendRoleCard(bot, p) {
  const info = roleInfo(p.role);
  try {
    await bot.telegram.sendMessage(
      p.id,
      `━━━━━━━━━━━━━━━━━━\n\n🎭 Sizning rolingiz\n\n${info.label}\n\nVazifangiz:\n${roleTask(p.role)}\n\n━━━━━━━━━━━━━━━━━━`,
      { reply_markup: { inline_keyboard: [[{ text: '📖 Rol haqida', callback_data: 'mrole_' + p.role }]] } }
    );
  } catch (e) {}
}

async function handleStartGame(bot, chat, user, answer) {
  const g = games.get(String(chat.id));
  if (!g || g.status !== 'lobby') return answer("⚠️ Hozir lobby yo'q.");
  if (!(await isAdmin(bot, chat.id, user.id)) && String(user.id) !== g.ownerId) {
    return answer('❌ Faqat admin boshlashi mumkin!');
  }
  if (g.players.length < CFG.MIN_PLAYERS) return answer(`⚠️ Kamida ${CFG.MIN_PLAYERS} kishi kerak!`);

  const roles = buildRoleList(g.players.length);
  g.players.forEach((p, i) => { p.role = roles[i].key; p.alive = true; });

  for (const p of g.players) await sendRoleCard(bot, p);

  try {
    await bot.telegram.sendAnimation(chat.id, 'https://media.giphy.com/media/xUPGcguWZHRC2HyBRS/giphy.gif');
  } catch (e) {}

  const botInfo = await bot.telegram.getMe();
  await bot.telegram.sendMessage(chat.id, "🎮 O'yin boshlandi!\n\n👇 Rolingizni ko'rish uchun botga o'ting.", {
    reply_markup: { inline_keyboard: [[{ text: '🤖 Botga kirish', url: `https://t.me/${botInfo.username}` }]] }
  });

  g.day = 1;
  await startNight(bot, g);
}

// ---------------- NIGHT ----------------
async function startNight(bot, g) {
  g.status = 'night';
  g.night = {
    mafiaVotes: {}, donId: null, killerTarget: null, doctorTarget: null,
    detectiveTarget: null, detectivePlayerId: null, lawyerTarget: null,
    courtesanTarget: null, startedAt: Date.now()
  };

  await bot.telegram.sendMessage(g.chatId, `🌙 TUN BOSHLANDI (${CFG.NIGHT_SEC} sek)\n\n😴 Maxsus rol egalari botda harakat qilmoqda...`);

  for (const p of alivePlayers(g)) {
    try {
      if (p.role === 'don' || p.role === 'mafia') {
        await bot.telegram.sendMessage(p.id, "🤵 Kimni o'ldirmoqchisiz?", { reply_markup: targetKeyboard(g, p.id, 'mn_kill_') });
      } else if (p.role === 'killer') {
        await bot.telegram.sendMessage(p.id, '🔪 Qurbonni tanlang:', { reply_markup: targetKeyboard(g, p.id, 'mn_kkill_') });
      } else if (p.role === 'doctor') {
        await bot.telegram.sendMessage(p.id, '👨\u200d⚕️ Kimni davolaysiz?', { reply_markup: targetKeyboard(g, p.id, 'mn_heal_') });
      } else if (p.role === 'detective') {
        await bot.telegram.sendMessage(p.id, '🕵 Kimni tekshirasiz?', { reply_markup: targetKeyboard(g, p.id, 'mn_check_') });
      } else if (p.role === 'lawyer') {
        await bot.telegram.sendMessage(p.id, '👨\u200d💼 Kimni himoya qilasiz?', { reply_markup: targetKeyboard(g, p.id, 'mn_protect_') });
      } else if (p.role === 'courtesan') {
        await bot.telegram.sendMessage(p.id, '💃 Kimni uxlatasiz?', { reply_markup: targetKeyboard(g, p.id, 'mn_block_') });
      }
    } catch (e) {}
  }

  scheduleTick(bot, g.chatId, CFG.NIGHT_SEC, 'night');
}

async function handleNightAction(bot, ctx, data) {
  const userId = String(ctx.from.id);
  const chatId = activeChat.get(userId);
  const g = chatId ? games.get(chatId) : null;
  if (!g || g.status !== 'night') return ctx.answerCbQuery('⏰ Vaqt tugagan yoki hozir tun emas.');

  const parts = data.split('_');
  const action = parts[1];
  const targetId = parts[2];

  const me = findPlayer(g, userId);
  if (!me || !me.alive) return ctx.answerCbQuery("Siz o'yinda emassiz.");

  if (action === 'kill' && (me.role === 'don' || me.role === 'mafia')) {
    g.night.mafiaVotes[userId] = targetId;
    if (me.role === 'don') g.night.donId = userId;
  } else if (action === 'kkill' && me.role === 'killer') {
    g.night.killerTarget = targetId;
  } else if (action === 'heal' && me.role === 'doctor') {
    g.night.doctorTarget = targetId;
  } else if (action === 'check' && me.role === 'detective') {
    g.night.detectiveTarget = targetId;
    g.night.detectivePlayerId = userId;
  } else if (action === 'protect' && me.role === 'lawyer') {
    g.night.lawyerTarget = targetId;
  } else if (action === 'block' && me.role === 'courtesan') {
    g.night.courtesanTarget = targetId;
  } else {
    return ctx.answerCbQuery("⚠️ Noto'g'ri harakat.");
  }

  await ctx.answerCbQuery('✅ Tanlovingiz qabul qilindi!');
}

function resolveNight(bot, g) {
  const night = g.night;
  const isBlocked = (id) => night.courtesanTarget && night.courtesanTarget === id;
  const deadNames = [];

  const mafiaVictim = majorityTarget(night.mafiaVotes);
  if (mafiaVictim && !isBlocked(mafiaVictim) && mafiaVictim !== night.doctorTarget) {
    const p1 = findPlayer(g, mafiaVictim);
    if (p1 && p1.alive) { p1.alive = false; deadNames.push(p1.name); }
  }

  if (night.killerTarget && !isBlocked(night.killerTarget) && night.killerTarget !== night.doctorTarget) {
    const p2 = findPlayer(g, night.killerTarget);
    if (p2 && p2.alive) { p2.alive = false; deadNames.push(p2.name); }
  }

  if (night.detectivePlayerId && night.detectiveTarget && !isBlocked(night.detectiveTarget)) {
    const target = findPlayer(g, night.detectiveTarget);
    if (target) {
      const mafiaTeam = target.role === 'don' || target.role === 'mafia';
      bot.telegram
        .sendMessage(night.detectivePlayerId, `🕵 Tekshiruv natijasi:\n${target.name} — ${mafiaTeam ? '🔴 Mafiya!' : '🟢 Tinch fuqaro'}`)
        .catch(() => {});
    }
  }

  return deadNames;
}

// ---------------- DAY / VOTE ----------------
async function startDay(bot, g, deadNames) {
  g.status = 'day';
  g.votes = {};
  g.accused = null;

  const alive = alivePlayers(g);
  let text = `☀️ TONG OTDI\n\n🏙 ${g.day}-KUN\n\n`;
  text += deadNames.length ? `💀 Bugun o'ldirilgan: ${deadNames.join(', ')}\n\n` : "😌 Bu kecha hech kim o'lmadi!\n\n";
  text += "🟢 Tiriklar ro'yxati:\n";
  alive.forEach((p, i) => { text += `${i + 1}. ${p.name}\n`; });

  await bot.telegram.sendMessage(g.chatId, text);

  const win = checkWin(g);
  if (win) return endGame(bot, g, win);

  await startVote(bot, g);
}

async function startVote(bot, g) {
  g.status = 'vote';
  g.votes = {};

  const rows = alivePlayers(g).map((p) => [{ text: p.name, callback_data: 'mv_' + p.id }]);
  await bot.telegram.sendMessage(g.chatId, `🗳 OVOZ BERISH (${CFG.VOTE_SEC} sek)\n\nKimni osishni xohlaysiz?`, {
    reply_markup: { inline_keyboard: rows }
  });

  scheduleTick(bot, g.chatId, CFG.VOTE_SEC, 'vote');
}

async function handleVote(bot, ctx, data) {
  const chatId = String(ctx.chat.id);
  const g = games.get(chatId);
  if (!g || g.status !== 'vote') return ctx.answerCbQuery('⏰ Ovoz berish vaqti emas.');

  const userId = String(ctx.from.id);
  const me = findPlayer(g, userId);
  if (!me || !me.alive) return ctx.answerCbQuery('Siz ovoz bera olmaysiz.');

  const targetId = data.substring(3);
  g.votes[userId] = targetId;
  await ctx.answerCbQuery('✅ Ovozingiz qabul qilindi!');
}

async function finishVote(bot, g) {
  const counts = {};
  for (const voter in g.votes) { const t = g.votes[voter]; counts[t] = (counts[t] || 0) + 1; }

  let top = null, topCount = 0;
  for (const t in counts) if (counts[t] > topCount) { top = t; topCount = counts[t]; }

  let resultText = '📊 Natija\n\n';
  for (const p of alivePlayers(g)) {
    const c = counts[p.id] || 0;
    if (c > 0) resultText += `${p.name}\n👍 ${c}\n\n`;
  }
  await bot.telegram.sendMessage(g.chatId, resultText);

  if (!top || topCount === 0) {
    await bot.telegram.sendMessage(g.chatId, '😌 Hech kim osilmadi (ovoz yetarli emas).');
    return startNight(bot, g);
  }

  g.accused = top;
  g.status = 'lastword';

  const accusedP = findPlayer(g, top);
  await bot.telegram.sendMessage(g.chatId, `🔔 ${accusedP.name}, oxirgi so'zingiz bor! (${CFG.LASTWORD_SEC} sek)`);

  scheduleTick(bot, g.chatId, CFG.LASTWORD_SEC, 'lastword');
}

async function executeAccused(bot, g) {
  const p = findPlayer(g, g.accused);
  if (p && p.alive) {
    p.alive = false;
    await bot.telegram.sendMessage(g.chatId, `⛓ ${p.name} osildi!\n\n🎭 Uning rolii: ${roleInfo(p.role).label}`);
  }

  const win = checkWin(g);
  if (win) return endGame(bot, g, win);

  g.day += 1;
  await startNight(bot, g);
}

// ---------------- WIN / END ----------------
function checkWin(g) {
  let mafiaAlive = 0, townAlive = 0, killerAlive = false;
  for (const p of alivePlayers(g)) {
    const team = roleInfo(p.role).team;
    if (team === 'mafia') mafiaAlive++;
    else if (team === 'solo_killer') killerAlive = true;
    else townAlive++;
  }
  if (mafiaAlive === 0 && !killerAlive) return 'town';
  if (mafiaAlive > 0 && mafiaAlive >= townAlive) return 'mafia';
  if (killerAlive && mafiaAlive + townAlive <= 1) return 'killer';
  return null;
}

async function endGame(bot, g, winnerTeam) {
  g.status = 'ended';

  const winnerLabel = winnerTeam === 'town' ? '👨 Tinch aholi' : winnerTeam === 'mafia' ? '🤵 Mafiya' : '🔪 Qotil';
  const winners = [], losers = [];

  for (const p of g.players) {
    const team = roleInfo(p.role).team;
    if (team === winnerTeam) {
      winners.push(`${p.name}\n${roleInfo(p.role).label}`);
      await addStat(p.id, 'win', 1);
      await addStat(p.id, 'money', 50);
      await addStat(p.id, 'xp', 12);
    } else {
      losers.push(`${p.name}\n${roleInfo(p.role).label}`);
    }
    await addStat(p.id, 'games', 1);
    activeChat.delete(p.id);
  }

  const durationSec = Math.round((Date.now() - g.createdAt) / 1000);
  const min = Math.floor(durationSec / 60), sec = durationSec % 60;

  let text = `🏆 O'YIN TUGADI\n\n🥇 G'olib\n\n${winnerLabel}\n\n`;
  text += `━━━━━━━━━━━━━━━━━━\n\n🏅 G'oliblar\n\n${winners.join('\n\n') || '—'}\n\n`;
  text += `━━━━━━━━━━━━━━━━━━\n\n❌ Mag'lublar\n\n${losers.join('\n\n') || '—'}\n\n`;
  text += `━━━━━━━━━━━━━━━━━━\n\n⏰ Davom etdi\n\n${min} min ${sec} sek\n\n`;
  text += `━━━━━━━━━━━━━━━━━━\n\n💰 Mukofot (g'oliblarga)\n\n+50 Coin\n+12 XP\n+1 Win`;

  await bot.telegram.sendMessage(g.chatId, text);
  games.delete(g.chatId);
}

// ---------------- TOP ----------------
async function handleTop(bot, chat) {
  const list = await User.find().sort({ win: -1 }).limit(10);
  const medals = ['🥇', '🥈', '🥉'];
  let text = "🏆 TOP O'YINCHILAR\n\n━━━━━━━━━━━━━━━━━━\n\n";
  list.forEach((u, i) => { text += `${medals[i] || i + 1 + '.'} ${u.name} — ${u.win} g'alaba\n`; });
  await bot.telegram.sendMessage(chat.id, text || "Hali statistika yo'q.");
}

module.exports = {
  CFG,
  games,
  activeChat,
  handleGameOpen,
  handleJoin,
  handleStopGame,
  handleExtendTime,
  handleStartGame,
  handleNightAction,
  handleVote,
  handleTop
};
