/* =====================================================
   ÇOKLU KAYNAKLI API - FOOTEO + BETBETTER (Kayıtsız)
===================================================== */

const FOOTEO_URL = "https://footeoplay.com/tr/picks";
const BETBETTER_BASE = "https://api.betbetter.world/v1/picks/soccer";

// Desteklenen büyük ligler (BetBetter lig kodları)
const BETBETTER_LEAGUES = ["epl", "la-liga", "serie-a", "bundesliga", "ligue-1"];

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  const allPicks = [];

  // Tüm kaynaklardan paralel veri çek
  const results = await Promise.allSettled([
    fetchFooteo(),
    fetchBetBetter()
  ]);

  results.forEach((result, i) => {
    const sourceName = ["footeo", "betbetter"][i];
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
   2. BETBETTER (API anahtarı gerekmez)
===================================================== */

async function fetchBetBetter() {
  const allPicks = [];

  for (const league of BETBETTER_LEAGUES) {
    try {
      const res = await fetch(`${BETBETTER_BASE}/${league}`, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; MacKuponlari/1.0)"
        },
        cache: "no-store"
      });

      if (!res.ok) {
        console.warn(`BetBetter ${league}: HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      const picks = data.picks || [];

      picks.forEach(pick => {
        // "Game" alanı genelde "Team A vs Team B" formatındadır
        const gameParts = (pick.game || "").split(" vs ");
        const home = gameParts[0]?.trim() || "";
        const away = gameParts[1]?.trim() || "";

        // Güven derecesine göre yüzdelik güven puanı belirle
        // HIGH: %85, LEAN: %70, LONG-SHOT: %55
        const confMap = { "HIGH": 85, "LEAN": 70, "LONG-SHOT": 55 };
        const confidence = confMap[pick.confidence] || 55;

        allPicks.push({
          id: `betbetter_${pick.id || `${home}_${away}_${pick.selection}`}`,
          source: "betbetter",
          league: league.toUpperCase().replace("-", " "),
          home: home,
          away: away,
          homeLogo: "",
          awayLogo: "",
          time: "", // BetBetter kickoff saati vermiyor
          kickoff: pick.commence_time || "",
          tip: pick.selection || "",
          odds: String(pick.fairOdds || ""),
          prob: confidence,
          confidence: confidence,
          analysis: `BetBetter model tahmini: ${pick.selection} (Güven: ${pick.confidence})`,
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
    const key = `${p.home}|${p.away}|${p.tip}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
