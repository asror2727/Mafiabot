const engine = require('./game/engine');
const { roleInfo, roleTask } = require('./game/roles');
const { getOrCreateUser } = require('./models/User');

function isGroupChat(ctx) {
  return ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup');
}

function register(bot) {
  // ---------- GURUH KOMANDALARI ----------
  bot.command('game', async (ctx) => {
    if (!isGroupChat(ctx)) return ctx.reply('⚠️ Bu komanda faqat guruhda ishlaydi.');
    await engine.handleGameOpen(bot, ctx.chat, ctx.from);
  });

  bot.command('start', async (ctx) => {
    if (isGroupChat(ctx)) {
      await engine.handleStartGame(bot, ctx.chat, ctx.from, (t) => ctx.reply(t));
    } else {
      await getOrCreateUser(ctx.from.id, ctx.from.first_name);
      await ctx.reply("👋 Salom! Guruhda /game buyrug'i bilan Mafia o'yinini boshlashingiz mumkin.");
    }
  });

  bot.command('stop', async (ctx) => {
    if (!isGroupChat(ctx)) return;
    await engine.handleStopGame(bot, null, ctx.chat, ctx.from, (t) => ctx.reply(t));
  });

  bot.command('vaqt', async (ctx) => {
    if (!isGroupChat(ctx)) return;
    await engine.handleExtendTime(bot, ctx.chat, (t) => ctx.reply(t));
  });

  bot.command('top', async (ctx) => {
    if (!isGroupChat(ctx)) return;
    await engine.handleTop(bot, ctx.chat);
  });

  // ---------- LOBBY TUGMALARI ----------
  bot.action('mgo_join', async (ctx) => {
    await engine.handleJoin(bot, ctx);
  });

  bot.action('mgo_start', async (ctx) => {
    await engine.handleStartGame(bot, ctx.chat, ctx.from, (t) => ctx.answerCbQuery(t));
  });

  bot.action('mgo_cancel', async (ctx) => {
    await engine.handleStopGame(bot, null, ctx.chat, ctx.from, (t) => ctx.answerCbQuery(t));
  });

  // ---------- TUN HARAKATLARI (PM) ----------
  bot.action(/^mn_.+/, async (ctx) => {
    await engine.handleNightAction(bot, ctx, ctx.callbackQuery.data);
  });

  // ---------- OVOZ BERISH (GURUH) ----------
  bot.action(/^mv_.+/, async (ctx) => {
    await engine.handleVote(bot, ctx, ctx.callbackQuery.data);
  });

  // ---------- ROL HAQIDA ----------
  bot.action(/^mrole_(.+)/, async (ctx) => {
    const roleKey = ctx.match[1];
    await ctx.answerCbQuery();
    await ctx.telegram.sendMessage(ctx.from.id, `📖 ${roleInfo(roleKey).label}\n\n${roleTask(roleKey)}`);
  });

  // ---------- /profile ----------
  bot.command('profile', async (ctx) => {
    const u = await getOrCreateUser(ctx.from.id, ctx.from.first_name);
    const s = (v) => (v ? '🟢' : '🔴');
    const text =
      `⭐ ID: ${u.id}\n\n👤 ${u.name}\n\n` +
      `💵 Dollar: ${u.money}\n💎 Olmos: ${u.diamond}\n⚡ Energiya: ${u.energy}\n\n` +
      `🛡 Himoya: ${u.shield}\n⛑️ Qotildan himoya: ${u.kill}\n⚖️ Ovozdan himoya: ${u.vote}\n🔫 Miltiq: ${u.gun}\n\n` +
      `🎭 Maska: ${u.mask}\n📁 Soxta hujjat: ${u.doc}\n\n` +
      `🏆 G'alaba: ${u.win}\n🎲 O'yinlar: ${u.games}`;

    await ctx.reply(text, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🛡 ' + s(u.shieldOn), callback_data: 't_shield' }, { text: '⛑ ' + s(u.killOn), callback_data: 't_kill' }],
          [{ text: '⚖️ ' + s(u.voteOn), callback_data: 't_vote' }, { text: '🔫 ' + s(u.gunOn), callback_data: 't_gun' }],
          [{ text: '🎭 ' + s(u.maskOn), callback_data: 't_mask' }, { text: '📁 ' + s(u.docOn), callback_data: 't_doc' }],
          [{ text: "🛒 Do'kon", callback_data: 'shop' }, { text: '💵 Pul', callback_data: 'shop_money' }],
          [{ text: '💎 Almaz', callback_data: 'shop_diamond' }, { text: '📢 Yangiliklar', callback_data: 'news' }]
        ]
      }
    });
  });

  const toggles = { t_shield: 'shieldOn', t_kill: 'killOn', t_vote: 'voteOn', t_gun: 'gunOn', t_mask: 'maskOn', t_doc: 'docOn' };
  bot.action(Object.keys(toggles), async (ctx) => {
    const field = toggles[ctx.callbackQuery.data];
    const u = await getOrCreateUser(ctx.from.id, ctx.from.first_name);
    u[field] = !u[field];
    await u.save();
    await ctx.answerCbQuery(u[field] ? '🟢 Yoqildi' : "🔴 O'chirildi");
  });

  // ---------- KELAJAKDA TO'LDIRISH UCHUN ----------
  bot.action('shop', async (ctx) => ctx.answerCbQuery("🛒 Do'kon tez orada!"));
  bot.action('shop_money', async (ctx) => ctx.answerCbQuery('💵 Tez orada!'));
  bot.action('shop_diamond', async (ctx) => ctx.answerCbQuery('💎 Tez orada!'));
  bot.action('news', async (ctx) => ctx.answerCbQuery('📢 Yangiliklar tez orada!'));
}

module.exports = register;
