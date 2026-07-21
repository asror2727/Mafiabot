const ROLES = {
  DON: { key: 'don', label: '🤵 Don', team: 'mafia' },
  MAFIA: { key: 'mafia', label: '🤵 Mafia', team: 'mafia' },
  KILLER: { key: 'killer', label: '🔪 Qotil', team: 'solo_killer' },
  DOCTOR: { key: 'doctor', label: '👨‍⚕️ Doktor', team: 'town' },
  DETECTIVE: { key: 'detective', label: '🕵 Komissar', team: 'town' },
  LAWYER: { key: 'lawyer', label: '👨‍💼 Advokat', team: 'town' },
  COURTESAN: { key: 'courtesan', label: '💃 Kezuvchi', team: 'town' },
  WANDERER: { key: 'wanderer', label: '🧙 Daydi', team: 'neutral' },
  JOURNALIST: { key: 'journalist', label: '👩‍💻 Jurnalist', team: 'town' },
  CIVILIAN: { key: 'civilian', label: '👨 Tinch aholi', team: 'town' }
};

function roleInfo(roleKey) {
  for (const k in ROLES) if (ROLES[k].key === roleKey) return ROLES[k];
  return ROLES.CIVILIAN;
}

function roleTask(roleKey) {
  const t = {
    don: "Mafiyani boshqarish. Har kecha kimni o'ldirishni tanlaysiz.",
    mafia: "Don bilan birga tinch aholini yo'q qilish.",
    killer: "Mustaqil harakat qilib, har kecha bittadan odam o'ldirasiz.",
    doctor: 'Har kecha bir kishini qutqarasiz.',
    detective: "Har kecha bir kishini tekshirib, mafiya ekan-emasligini bilib olasiz.",
    lawyer: 'Bir o\'yinchini komissar tekshiruvidan himoya qilasiz.',
    courtesan: "Har kecha bir o'yinchini 'uxlatib', uning kechagi harakatini bloklaysiz.",
    wanderer: 'Kechasi tasodifiy yurasiz, ba\'zan foydali ma\'lumot olasiz.',
    journalist: 'Kechalari kuzatuvlar olib borasiz.',
    civilian: "Muhokoma va ovoz berish orqali mafiyani top!"
  };
  return t[roleKey] || 'Vazifangiz aniqlanmagan.';
}

// Odam soniga qarab rollar ro'yxati (Don har doim bo'ladi)
function buildRoleList(n) {
  const roles = [ROLES.DON];

  const mafiaCount = Math.max(1, Math.floor(n / 4));
  for (let i = 1; i < mafiaCount; i++) roles.push(ROLES.MAFIA);

  if (n >= 5) roles.push(ROLES.DOCTOR);
  if (n >= 5) roles.push(ROLES.DETECTIVE);
  if (n >= 7) roles.push(ROLES.KILLER);
  if (n >= 8) roles.push(ROLES.LAWYER);
  if (n >= 9) roles.push(ROLES.COURTESAN);
  if (n >= 10) roles.push(ROLES.WANDERER);
  if (n >= 10) roles.push(ROLES.JOURNALIST);

  while (roles.length < n) roles.push(ROLES.CIVILIAN);
  const finalRoles = roles.slice(0, n);

  for (let i = finalRoles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = finalRoles[i]; finalRoles[i] = finalRoles[j]; finalRoles[j] = tmp;
  }
  return finalRoles;
}

module.exports = { ROLES, roleInfo, roleTask, buildRoleList };
