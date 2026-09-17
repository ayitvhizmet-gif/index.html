/* =====================================================
   ÇOKLU KAYNAKLI API - FOOTEO + BZZOIRO + BETBETTER
===================================================== */

const FOOTEO_URL = "https://footeoplay.com/tr/picks";
const BZZOIRO_URL = "https://sports.bzzoiro.com/api/predictions/?upcoming=true";
const BETBETTER_URL = "https://api.betbetter.world/v1/picks/soccer";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  const allPicks = [];

  // Tüm kaynaklardan paralel veri çek
  const results = await Promise.allSettled([
    fetchFooteo(),
    fetchBzzoiro(),
    fetchBetBetter()
  ]);

  results.forEach((result, i) => {
    const sourceName = ["footeo", "bzzoiro", "betbetter"][i];
    if (result.status === "fulfilled") {
      allPicks.push(...result.value);
      console.log(`✅ ${sourceName}: ${result.value.length} maç`);
    } else {
      console.error(`❌ ${sourceName} hatası:`, result.reason?.message);
    }
  });

  // Tekrarlanan maçları temizle
  const unique = removeDuplicates(allPicks);

  return res.status(200).json({
    success: true,
    updated_at: new Date().toISOString(),
    count: unique.length,
    sources: {
      footeo: allPicks.filter(p => p.source === "footeo").length,
      bzzoiro: allPicks.filter(p => p.source === "bzzoiro").length,
      betbetter: allPicks.filter(p => p.source === "betbetter").length
    },
    picks: unique
  });
}


/* =====================================================
   1. FOOTEO (mevcut parser)
===================================================== */

async function fetchFooteo() {
  const res = await fetch(FOOTEO_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8"
    },
    cache: "no-store"
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  return parseFooteo(html);
}

function parseFooteo(html) {
  const picks = [];
  const regex = /self\.__next_f\.push\s*\(\s*\[\s*\d+\s*,\s*("(?:[^"\\]|\\.)*")\s*\]\s*\)/g;
  let match;

  while ((match = regex.exec(html)) !== null) {
    let str;
    try { str = JSON.parse(match[1]); } catch (e) { continue; }
    const idx = str.indexOf('"initialPicks":');
    if (idx === -1) continue;

    const arrayStart = str.indexOf('[', idx);
    if (arrayStart === -1) continue;

    let depth = 0, inString = false, escaped = false, end = -1;
    for (let i = arrayStart; i < str.length; i++) {
      const ch = str[i];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '[') depth++;
      else if (ch === ']') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end === -1) continue;

    try {
      const arr = JSON.parse(str.substring(arrayStart, end + 1));
      arr.forEach(item => {
        picks.push({
          id: `footeo_${item.id}`,
          source: "footeo",
          league: item.league || "",
          home: item.home || "",
          away: item.away || "",
          homeLogo: item.homeLogo || "",
          awayLogo: item.awayLogo || "",
          time: item.time || "",
          kickoff: item.kickoff || "",
          tip: item.tip || "",
          odds: String(item.odds || ""),
          prob: item.prob || 0,
          confidence: item.prob || 0,
          analysis: item.analysis || "",
          isHero: item.isHero || false,
          today: true
        });
      });
      break;
    } catch (e) { continue; }
  }
  return picks;
}


/* =====================================================
   2. BZZOIRO (ücretsiz kayıt sonrası token gerekir)
===================================================== */

async function fetchBzzoiro() {
  const token = process.env.BZZOIRO_TOKEN;
  if (!token) {
    console.warn("BZZOIRO_TOKEN tanımlı değil, atlanıyor");
    return [];
  }

  const res = await fetch(BZZOIRO_URL, {
    headers: {
      "Authorization": `Token ${token}`,
      "Accept": "application/json"
    },
    cache: "no-store"
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  return (data.results || []).map(item => ({
    id: `bzzoiro_${item.id}`,
    source: "bzzoiro",
    league: `${item.league?.country || ""}: ${item.league?.name || ""}`,
    home: item.home_team || "",
    away: item.away_team || "",
    homeLogo: item.home_team_obj?.logo || "",
    awayLogo: item.away_team_obj?.logo || "",
    time: item.event_date ? new Date(item.event_date).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "",
    kickoff: item.event_date || "",
    tip: item.prediction || item.tip || "",
    odds: String(item.odds_home || item.odds || ""),
    prob: item.confidence || item.probability || 0,
    confidence: item.confidence || item.probability || 0,
    analysis: item.analysis || `CatBoost ML tahmini: ${item.prediction || ""}`,
    isHero: false,
    today: true
  }));
}


/* =====================================================
   3. BETBETTER (API anahtarı gerekmez)
===================================================== */

async function fetchBetBetter() {
  // Desteklenen ligler
  const leagues = ["epl", "la-liga", "serie-a", "bundesliga", "ligue-1"];
  const allPicks = [];

  for (const league of leagues) {
    try {
      const res = await fetch(`${BETBETTER_URL}/${league}`, {
        headers: { "Accept": "application/json" },
        cache: "no-store"
      });
      if (!res.ok) continue;
      const data = await res.json();

      (data.picks || []).forEach(pick => {
        allPicks.push({
          id: `betbetter_${pick.id || `${pick.game}-${pick.selection}`}`,
          source: "betbetter",
          league: league.toUpperCase(),
          home: pick.game?.split(" vs ")[0] || pick.home || "",
          away: pick.game?.split(" vs ")[1] || pick.away || "",
          time: "",
          kickoff: pick.commence_time || "",
          tip: pick.selection || "",
          odds: String(pick.fairOdds || pick.odds || ""),
          prob: pick.confidence === "HIGH" ? 85 : pick.confidence === "LEAN" ? 70 : 55,
          confidence: pick.confidence === "HIGH" ? 85 : pick.confidence === "LEAN" ? 70 : 55,
          analysis: `Model tahmini: ${pick.selection} (Güven: ${pick.confidence})`,
          isHero: pick.confidence === "HIGH",
          today: true
        });
      });
    } catch (e) {
      console.error(`BetBetter ${league} hatası:`, e.message);
    }
  }
  return allPicks;
}


/* =====================================================
   YARDIMCI: Tekrarları temizle
===================================================== */

function removeDuplicates(picks) {
  const seen = new Set();
  return picks.filter(p => {
    // Aynı maç + aynı tahmin kombinasyonu varsa tekrar etme
    const key = `${p.home}|${p.away}|${p.tip}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
