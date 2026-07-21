require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');
const connectDB = require('./db');
const registerHandlers = require('./handlers');

const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN topilmadi! .env fayliga yoki Render Environment Variables'ga qo'ying.");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

async function main() {
  if (MONGODB_URI) {
    await connectDB(MONGODB_URI);
  } else {
    console.warn('⚠️ MONGODB_URI berilmagan — statistika (pul, g\'alaba) saqlanmaydi!');
  }

  registerHandlers(bot);

  await bot.launch();
  console.log('🚀 Mafia bot ishga tushdi!');

  // Render bepul "Web Service" turi doim biror portni tinglashni talab qiladi,
  // aks holda deploy "muvaffaqiyatsiz" deb hisoblanadi. Shu uchun mayda server:
  const app = express();
  app.get('/', (req, res) => res.send('Mafia bot ishlayapti ✅'));
  app.listen(PORT, () => console.log(`🌐 HTTP server ${PORT}-portda ishlayapti`));
}

main().catch((err) => {
  console.error('❌ Botni ishga tushirishda xatolik:', err);
  process.exit(1);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
