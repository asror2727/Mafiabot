# 🚀 Mafia Bot

Telegram guruhida ishlaydigan Mafia o'yini boti. Node.js + Telegraf + MongoDB.

## 📁 Fayllar tuzilishi

```
mafia-bot/
├── index.js          # botni ishga tushiruvchi asosiy fayl
├── handlers.js        # /game /start /stop /vaqt /top /profile komandalari
├── db.js               # MongoDB ulanish
├── models/User.js       # foydalanuvchi statistikasi (pul, g'alaba va h.k.)
├── game/roles.js        # rollar ro'yxati va taqsimlash mantig'i
├── game/engine.js        # tun/kun/ovoz/g'olib — asosiy o'yin mantig'i
├── package.json
└── .env.example
```

## 1️⃣ Nima uchun MongoDB kerak?

Render (va boshqa xosting)dagi bepul serverlar vaqti-vaqti bilan **qayta ishga tushadi**
(deploy qilganda, uxlab qolganda, xato bo'lganda). Har safar qayta ishga tushganda
xotiradagi (RAM) hamma narsa **o'chib ketadi**.

- Agar o'yinchilarning puli, g'alabasi, XP'si faqat xotirada saqlansa — server
  qayta ishga tushganda hammasi 0'ga tushib qoladi.
- MongoDB — bu **doimiy** (disk asosidagi) ma'lumotlar bazasi. U alohida serverda
  turadi, botingiz necha marta qayta ishga tushmasin, ma'lumot yo'qolmaydi.

Faol o'yin holati (hozir kim qatnashayapti, tun/kunmi) esa tezkor o'zgaradigan
vaqtinchalik narsa bo'lgani uchun xotirada (`game/engine.js` ichidagi `Map`) saqlanadi —
bu tezroq ishlaydi. Agar kelajakda buni ham yo'qotmaslikni xohlasangiz, aytib qo'ying,
uni ham MongoDB/Redis'ga ko'chirib beraman.

## 2️⃣ Bot token qayerga qo'yiladi?

1. Telegram'da [@BotFather](https://t.me/BotFather) ga `/newbot` yuboring, tokenni oling.
2. Bu papkada `.env.example` faylini nusxalab `.env` deb saqlang (faqat **lokal test** uchun kerak):
   ```
   BOT_TOKEN=sizning_tokeningiz
   MONGODB_URI=sizning_mongodb_linkingiz
   ```
3. Render'ga deploy qilganda `.env` fayl kerak emas — token va DB linkni
   Render Dashboard'dagi **Environment Variables** bo'limiga qo'yasiz (pastda yozilgan).

## 3️⃣ MongoDB Atlas (bepul) yaratish

1. [mongodb.com/atlas](https://www.mongodb.com/atlas) ga kiring, ro'yxatdan o'ting.
2. **Create a Free Cluster** (M0 — bepul) tugmasini bosing.
3. **Database Access** → yangi user yarating (username/password yozib oling).
4. **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`).
5. **Connect** → **Drivers** → connection string'ni ko'chiring, masalan:
   ```
   mongodb+srv://user:parol@cluster0.xxxxx.mongodb.net/mafiabot
   ```
   Shu qatorni `MONGODB_URI` sifatida ishlatasiz.

## 4️⃣ GitHub'ga yuklash

```bash
cd mafia-bot
git init
git add .
git commit -m "Mafia bot - birinchi versiya"
git branch -M main
git remote add origin https://github.com/USERNAME/mafia-bot.git
git push -u origin main
```

`.env` fayli `.gitignore` orqali repoga yuklanmaydi — bu **to'g'ri**, chunki
tokeningizni ochiq repoga qo'yish xavfli.

## 5️⃣ Render'da deploy qilish

1. [render.com](https://render.com) ga kiring → **New +** → **Web Service**.
2. GitHub repongizni tanlang (kerak bo'lsa Render'ga GitHub'ni ulaysiz).
3. Sozlamalar:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (boshlash uchun yetarli)
4. **Environment Variables** bo'limida qo'shing:
   - `BOT_TOKEN` = sizning tokeningiz
   - `MONGODB_URI` = Atlas'dan olgan connection string
5. **Create Web Service** tugmasini bosing — Render avtomatik build qilib,
   botni ishga tushiradi. Loglarda `🚀 Mafia bot ishga tushdi!` yozuvini ko'rsangiz — tayyor.

⚠️ **Eslatma**: Render bepul tarifdagi Web Service 15 daqiqa faoliyatsiz qolsa
uxlab qoladi (keyingi so'rovda uyg'onadi, lekin bir necha soniya kechikish bilan).
Agar bot doim faol tursin desangiz — [UptimeRobot](https://uptimerobot.com)
orqali botning URL manzilini har 5-10 daqiqada "ping" qilib turishingiz mumkin,
yoki Render'ning pullik tarifiga o'tasiz.

## 6️⃣ Guruhda ishlatish

1. Botni guruhga qo'shing, uni **admin** qiling (a'zolarni ko'rish, xabar
   pin qilish uchun kerak).
2. Guruh admini `/game` yuboradi → lobby ochiladi.
3. Odamlar `➕ Qo'shilish` tugmasini bosadi.
4. Kamida 3 kishi qo'shilgach, admin `▶️ Boshlash` bosadi → rollar tarqatiladi,
   o'yin boshlanadi.
5. `/stop` — o'yinni bekor qilish, `/vaqt` — joriy bosqich vaqtini uzaytirish,
   `/top` — reyting.

## 7️⃣ Keyingi qadam

Sinab ko'ring, xatolik chiqsa (masalan botni admin qilishni unutish, token
noto'g'ri kiritilishi kabi) — aniq xato matnini yuboring, birga tuzatamiz.
Keyin: haqiqiy do'kon (`/shop`), item sotib olish, energiya tizimi va
qolgan rollarni (Daydi, Jurnalist) to'liq faollashtirish ustida ishlaymiz.
