/* =====================================================
   ÇOKLU KAYNAKLI API - FOOTEO + FDB4 (Kayıtsız, Ücretsiz)
===================================================== */

const FOOTEO_URL = "https://footeoplay.com/tr/picks";
const FDB4_BASE = "https://fdb4.io/api";

// FDB4'ün desteklediği popüler ligler
const FDB4_LEAGUES = [
  "premier-league",
  "la-liga",
  "serie-a",
  "bundesliga",
  "ligue-1",
  "champions-league"
];

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  const allPicks = [];

  const results = await Promise.allSettled([
    fetchFooteo(),
    fetchFDB4()
  ]);

  results.forEach((result, i) => {
    const sourceName = ["footeo", "fdb4"][i];
    if (result.status === "fulfilled") {
      allPicks.push(...result.value);
      console.log(`✅ ${sourceName}: ${result.value.length} maç`);
    } else {
      console.error(`❌ ${sourceName} hatası:`, result.reason?.message);
    }
  });

  const unique = removeDuplicates(allPicks);

  return res.status(200).json({
    success: true,
    updated_at: new Date().toISOString(),
    count: unique.length,
    sources: {
      footeo: allPicks.filter(p => p.source === "footeo").length,
      fdb4: allPicks.filter(p => p.source === "fdb4").length
    },
    picks: unique
  });
}


/* =====================================================
   1. FOOTEO PARSER (Mevcut, Çalışıyor)
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
   2. FDB4 (Kayıtsız, Ücretsiz)
===================================================== */

async function fetchFDB4() {
  const allPicks = [];

  for (const league of FDB4_LEAGUES) {
    try {
      // FDB4'ün halka açık API endpoint'i
      const res = await fetch(`${FDB4_BASE}/leagues/${league}/predictions`, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; MacKuponlari/1.0)"
        },
        cache: "no-store"
      });

      if (!res.ok) {
        console.warn(`FDB4 ${league}: HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      const matches = data.matches || data.predictions || [];

      matches.forEach(match => {
        const home = match.homeTeam || match.home_team || "";
        const away = match.awayTeam || match.away_team || "";
        if (!home || !away) return;

        // Tahmin ve olasılık verileri
        const prediction = match.prediction || match.pick || {};
        const tip = prediction.outcome || prediction.tip || "";
        const confidence = prediction.probability || prediction.confidence || 50;

        allPicks.push({
          id: `fdb4_${league}_${home}_${away}`.replace(/[\s/]+/g, "_"),
          source: "fdb4",
          league: league.toUpperCase().replace(/-/g, " "),
          home: home,
          away: away,
          homeLogo: match.homeLogo || "",
          awayLogo: match.awayLogo || "",
          time: match.matchTime || match.time || "",
          kickoff: match.matchDate || match.kickoff || "",
          tip: tip,
          odds: String(prediction.odds || match.odds || ""),
          prob: Math.round(confidence),
          confidence: Math.round(confidence),
          analysis: `FDB4 model: ${tip} (${Math.round(confidence)}%)`,
          isHero: confidence >= 80,
          today: true
        });
      });

    } catch (e) {
      console.error(`FDB4 ${league} hatası:`, e.message);
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
    const key = `${normalize(p.home)}|${normalize(p.away)}|${p.tip}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalize(s) {
  return String(s || "").toLowerCase()
    .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g")
    .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]/g, "");
}
