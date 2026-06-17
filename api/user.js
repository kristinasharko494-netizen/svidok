export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  async function sbFetch(path, opts = {}) {
    const r = await fetch(SUPABASE_URL + path, {
      ...opts,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        ...opts.headers,
      },
    });
    return r.json();
  }

  try {
    const { action, email, name, birthdate, userId, memory } = req.body;

    if (action === 'getUser') {
      const users = await sbFetch(`/rest/v1/users?email=eq.${encodeURIComponent(email)}`);
      return res.status(200).json(users?.[0] || null);
    }

    if (action === 'createUser') {
      const astro = buildAstroProfile(birthdate);
      const created = await sbFetch('/rest/v1/users', {
        method: 'POST',
        body: JSON.stringify({ email, name, birthdate, astro: JSON.stringify(astro), memory: '' }),
      });
      return res.status(200).json(created?.[0] || null);
    }

    if (action === 'updateMemory') {
      await sbFetch(`/rest/v1/users?id=eq.${userId}`, {
        method: 'PATCH',
        headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify({ memory }),
      });
      return res.status(200).json({ ok: true });
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

function getZodiac(day, month) {
  const signs = [
    [20,'Козеріг'],[19,'Водолій'],[20,'Риби'],[20,'Овен'],
    [21,'Телець'],[21,'Близнюки'],[22,'Рак'],[22,'Лев'],
    [23,'Діва'],[23,'Терези'],[22,'Скорпіон'],[22,'Стрілець'],[31,'Козеріг']
  ];
  return day <= signs[month-1][0] ? signs[month-1][1] : signs[month][1];
}

function getChineseSign(year) {
  const signs = ['Мавпа','Півень','Собака','Кабан','Пацюк','Бик','Тигр','Кролик','Дракон','Змія','Кінь','Коза'];
  return signs[year % 12];
}

function getLifePath(day, month, year) {
  const sum = str => str.split('').reduce((a,b) => a + parseInt(b), 0);
  let n = sum(`${day}`) + sum(`${month}`) + sum(`${year}`);
  while (n > 9 && n !== 11 && n !== 22) { n = sum(`${n}`); }
  return n;
}

function buildAstroProfile(birthdate) {
  try {
    const parts = birthdate.split('.');
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const year = parseInt(parts[2]);
    return {
      zodiac: getZodiac(day, month),
      chinese: getChineseSign(year),
      lifePath: getLifePath(day, month, year),
    };
  } catch(e) { return null; }
}
