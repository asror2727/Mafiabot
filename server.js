// =========================================================================
// RENDER SERVER — rol taqsimlash + private xabar yuborish + tun natijasi
//
// Render.com'ga deploy qilganda ENVIRONMENT VARIABLES qo'shing:
//   BOT_TOKEN      — Telegram bot tokeningiz (@BotFather dan)
//   SHARED_SECRET  — o'zingiz o'ylab topgan maxfiy so'z (BB shu bilan so'rov yuboradi)
//   PORT           — Render o'zi beradi, qo'lda kerak emas
//
// package.json'ga: "express" kerak bo'ladi ("npm install express")
// Node 18+ bo'lsa fetch tayyor keladi (qo'shimcha kutubxona shart emas)
// =========================================================================

const express = require("express")
const app = express()
app.use(express.json())

const BOT_TOKEN = process.env.BOT_TOKEN
const SHARED_SECRET = process.env.SHARED_SECRET
const TELEGRAM_API = "https://api.telegram.org/bot" + BOT_TOKEN

// ---------- Rollar jadvali (BB'dagi bilan bir xil) ----------
const ROLE_INFO = {
  "🤵 Don":            { team: "mafia" },
  "😏 Mafia":          { team: "mafia" },
  "👨‍💼 Advokat":       { team: "mafia" },
  "🕵️ Komissar":       { team: "town" },
  "👨‍⚕️ Doktor":        { team: "town" },
  "💃 Kezuvchi":        { team: "town" },
  "👮 Serjant":         { team: "town" },
  "🧙 Daydi":           { team: "town" },
  "👑 Qirol":           { team: "town" },
  "🐺 Bo'ri":           { team: "town" },
  "💣 Afsungar":        { team: "town" },
  "🧪 Alkimyogar":      { team: "town" },
  "👻 Arvoh":           { team: "town" },
  "🧑‍⚖️ Sudya":         { team: "town" },
  "🦊 Ayyor":           { team: "town" },
  "💻 Xaker":           { team: "solo" },
  "🛍 Savdogar":        { team: "solo" },
  "👷 Konchi":          { team: "solo" },
  "🐉 Gidra":           { team: "solo" },
  "🦹 Yollanma qotil":  { team: "solo" },
  "🎭 Mimik":           { team: "solo" },
  "🧛 Vampir":          { team: "solo" },
  "🤡 Masxaraboz":      { team: "solo" },
  "👨 Tinch aholi":     { team: "town" }
}

const ROLE_ACTIONS = {
  "🤵 Don":            { action: "kill",    text: "🔪 Kimni o'ldirasiz?" },
  "😏 Mafia":          { action: "passive", text: "🤵 Donning tanlovini kuting." },
  "👨‍💼 Advokat":       { action: "passive", text: "🛡️ Tun davom etmoqda." },
  "🕵️ Komissar":       { action: "check",   text: "🔍 Kimni tekshirasiz?" },
  "👨‍⚕️ Doktor":        { action: "heal",    text: "💊 Kimni davolaysiz?" },
  "💃 Kezuvchi":        { action: "sleep",   text: "🥂 Kimga mehmon bo'lasiz?" },
  "👮 Serjant":         { action: "passive", text: "🌙 Tun davom etmoqda." },
  "🧙 Daydi":           { action: "check",   text: "🚪 Kimning uyiga kirasiz?" },
  "💻 Xaker":           { action: "check",   text: "💻 Kimning rolini aniqlaysiz?" },
  "🧛 Vampir":          { action: "bite",    text: "🧛 Kimni tishlaysiz?" }
}
// Yuqorida yo'q rollarning barchasi passiv ("🌙 Tun davom etmoqda.") deb olinadi

function defaultAction(role) {
  return ROLE_ACTIONS[role] || { action: "passive", text: "🌙 Tun davom etmoqda." }
}

// ---------- Rollarni o'yinchi soniga qarab tayyorlash ----------
function buildRoles(count) {
  let roles = []
  roles.push("🤵 Don")
  roles.push("🕵️ Komissar")

  if (count == 4) {
    if (Math.random() < 0.5) roles.push("👨‍⚕️ Doktor")
  } else if (count >= 4) {
    roles.push("👨‍⚕️ Doktor")
  }

  if (count >= 5)  roles.push("😏 Mafia")
  if (count >= 8)  roles.push("😏 Mafia")
  if (count >= 6)  roles.push("👨‍💼 Advokat")

  if (count >= 7)  roles.push("💃 Kezuvchi")
  if (count >= 10) roles.push("👮 Serjant")
  if (count >= 12) roles.push("🧙 Daydi")
  if (count >= 14) roles.push("👑 Qirol")
  if (count >= 16) roles.push("🐺 Bo'ri")
  if (count >= 18) roles.push("💣 Afsungar")
  if (count >= 20) roles.push("🧪 Alkimyogar")
  if (count >= 20) roles.push("👻 Arvoh")
  if (count >= 20) roles.push("🧑‍⚖️ Sudya")
  if (count >= 18) roles.push("🦊 Ayyor")

  if (count >= 9)  roles.push("💻 Xaker")
  if (count >= 10) roles.push("🛍 Savdogar")
  if (count >= 12) roles.push("👷 Konchi")
  if (count >= 14) roles.push("🐉 Gidra")
  if (count >= 16) roles.push("🦹 Yollanma qotil")
  if (count >= 16) roles.push("🎭 Mimik")
  if (count >= 16) roles.push("🧛 Vampir")
  if (count >= 18) roles.push("🤡 Masxaraboz")

  while (roles.length < count) roles.push("👨 Tinch aholi")
  if (roles.length > count) roles = roles.slice(0, count)

  for (let i = roles.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1))
    let t = roles[i]; roles[i] = roles[j]; roles[j] = t
  }
  return roles
}

// ---------- Telegramga private xabar yuborish ----------
async function sendTelegramMessage(chatId, text, replyMarkup) {
  const body = { chat_id: chatId, text, parse_mode: "HTML" }
  if (replyMarkup) body.reply_markup = replyMarkup

  const res = await fetch(TELEGRAM_API + "/sendMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })
  return res.json()
}

function checkSecret(req, res) {
  if (req.headers["x-secret"] !== SHARED_SECRET) {
    res.status(403).json({ ok: false, error: "forbidden" })
    return false
  }
  return true
}

// =========================================================================
// POST /startNight — rollarni beradi va har kimga private yuboradi
// Body: { chatId, players: [{id, name}] }
// =========================================================================
app.post("/startNight", async (req, res) => {
  if (!checkSecret(req, res)) return

  const { chatId, players } = req.body
  if (!players || !players.length) {
    return res.status(400).json({ ok: false, error: "players kerak" })
  }

  const count = players.length
  const roles = buildRoles(count)

  const updated = players.map((p, i) => {
    const role = roles[i]
    const team = (ROLE_INFO[role] || {}).team || "town"
    return { id: p.id, name: p.name, alive: true, role, team, target: null }
  })

  const failed = []

  for (const p of updated) {
    const info = defaultAction(p.role)
    let markup = null

    if (info.action != "passive") {
      markup = {
        inline_keyboard: updated
          .filter(x => x.alive && x.id != p.id)
          .map(x => [{ text: x.name, callback_data: "/action " + p.role + "_" + x.id }])
      }
    }

    const text = "🎭 <b>Sizning rolingiz</b>\n\n<b>" + p.role + "</b>\n\n" + info.text

    try {
      const result = await sendTelegramMessage(p.id, text, markup)
      if (!result.ok) failed.push(p.name)
    } catch (e) {
      failed.push(p.name)
    }
  }

  return res.json({ ok: true, chatId, players: updated, failed })
})

// =========================================================================
// POST /finishNight — tun natijasini hisoblaydi (asosiy: Don o'ldirdi / Doktor davoladi)
// Body: { chatId, players, actions: { don: targetId, doktor: targetId, komissar: targetId, ... } }
//
// ESLATMA: bu boshlang'ich, oddiy versiya. Bo'ri aylanishi, Vampir tishlashi,
// Alkimyogar iksirlari kabi murakkab effektlar hozircha kiritilmagan —
// kerak bo'lsa alohida qo'shib beraman.
// =========================================================================
app.post("/finishNight", async (req, res) => {
  if (!checkSecret(req, res)) return

  const { chatId, players, actions } = req.body
  if (!players) return res.status(400).json({ ok: false, error: "players kerak" })

  const donTarget = actions && actions.don
  const doktorTarget = actions && actions.doktor

  let diedName = null

  const updated = players.map(p => ({ ...p }))

  if (donTarget && donTarget != doktorTarget) {
    const victim = updated.find(p => String(p.id) == String(donTarget))
    if (victim && victim.alive) {
      victim.alive = false
      diedName = victim.name
    }
  }

  const summaryText = diedName
    ? "☀️ <b>Tong yoritdi.</b>\n\n💀 Bu tunda <b>" + diedName + "</b> halok bo'ldi."
    : "☀️ <b>Tong yoritdi.</b>\n\n🎉 Bu tun hech kim halok bo'lmadi!"

  return res.json({
    ok: true,
    chatId,
    result: { players: updated, summaryText }
  })
})

app.listen(process.env.PORT || 3000, () => {
  console.log("Server ishga tushdi")
})
