/* =====================================================
   ÇOKLU KAYNAKLI API - FOOTEO + FOREBET (Kayıtsız)
===================================================== */

const FOOTEO_URL = "https://footeoplay.com/tr/picks";
const FOREBET_URL = "https://www.forebet.com/tr/futbol-tahminleri-ve-istatistikler/bugun";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  const allPicks = [];

  // İki kaynaktan paralel çek
  const results = await Promise.allSettled([
    fetchFooteo(),
    fetchForebet()
  ]);

  results.forEach((result, i) => {
    const sourceName = ["footeo", "forebet"][i];
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
      forebet: allPicks.filter(p => p.source === "forebet").length
    },
    picks: unique
  });
}


/* =====================================================
   1. FOOTEO PARSER
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
   2. FOREBET PARSER
===================================================== */

async function fetchForebet() {
  const res = await fetch(FOREBET_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
      "Referer": "https://www.forebet.com/"
    },
    cache: "no-store"
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  return parseForebet(html);
}

function parseForebet(html) {
  const picks = [];

  // Maç satırlarını bul (Forebet her maçı <div class="rcnt"> veya <tr> içinde tutar)
  // Satır bazlı yaklaşım: <div class="rcnt ..."> ... </div> veya <tr id="...">
  // Her maç için: takım isimleri, lig, saat, tahmin (1/X/2), olasılık, oran

  // Basitleştirilmiş yaklaşım: tüm html'i satırlara ayır, maç bloklarını yakala
  const rowRegex = /<div[^>]*class="[^"]*rcnt[^"]*"[^>]*data-[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;

  // Alternatif: Forebet satır yapısı tablo şeklinde. <tr> etiketleri ile ayır.
  const trRegex = /<tr[^>]*id="[^"]*"[^>]*>([\s\S]*?)<\/tr>/g;
  let trMatch;

  while ((trMatch = trRegex.exec(html)) !== null) {
    const row = trMatch[1];
    const pick = parseForebetRow(row);
    if (pick) picks.push(pick);
  }

  // Eğer tr ile bulamazsak, alternatif olarak JSON-LD veya script verisini dene
  if (picks.length === 0) {
    return parseForebetFallback(html);
  }

  return picks;
}

function parseForebetRow(row) {
  try {
    // Takım isimleri: <span class="homeTeam"> ve <span class="awayTeam"> veya <a> içinde
    const homeMatch = row.match(/class="[^"]*homeTeam[^"]*"[^>]*>([^<]+)</) ||
                      row.match(/class="[^"]*tnmscn[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/);
    const awayMatch = row.match(/class="[^"]*awayTeam[^"]*"[^>]*>([^<]+)</) ||
                      row.match(/class="[^"]*tnmscn[^"]*"[^>]*>[\s\S]*?<\/a>[\s\S]*?<a[^>]*>([^<]+)<\/a>/);

    if (!homeMatch || !awayMatch) return null;

    const home = homeMatch[1].trim();
    const away = awayMatch[1].trim();
    if (!home || !away) return null;

    // Lig
    const leagueMatch = row.match(/class="[^"]*shortTag[^"]*"[^>]*>([^<]+)</) ||
                        row.match(/title="([^"]+)"/);
    const league = leagueMatch ? leagueMatch[1].trim() : "";

    // Saat
    const timeMatch = row.match(/(\d{1,2}:\d{2})/);
    const time = timeMatch ? timeMatch[1] : "";

    // Tahmin: <span class="forepr"> veya <div class="fprc">
    const tipMatch = row.match(/class="[^"]*forepr[^"]*"[^>]*>([^<]+)</) ||
                     row.match(/class="[^"]*fprc[^"]*"[^>]*>([^<]+)</);
    let tip = tipMatch ? tipMatch[1].trim() : "";

    // Tahmin tipini normalize et
    tip = normalizeTip(tip);

    // Olasılık: yüzde değerleri
    const probMatches = row.match(/(\d{1,2})%/g);
    let prob = 0;
    if (probMatches && probMatches.length > 0) {
      const probs = probMatches.map(p => parseInt(p));
      prob = Math.max(...probs);
    }

    // Oran: <span class="forepr"> veya <div class="ex_td"> içindeki decimal
    const oddsMatch = row.match(/(\d{1,2}\.\d{1,2})/);
    const odds = oddsMatch ? oddsMatch[1] : "";

    if (!home || !away || !tip) return null;

    return {
      id: `forebet_${home}_${away}_${time}`.replace(/\s+/g, "_"),
      source: "forebet",
      league: league || "Forebet",
      home: home,
      away: away,
      homeLogo: "",
      awayLogo: "",
      time: time,
      kickoff: "",
      tip: tip,
      odds: odds,
      prob: prob,
      confidence: prob,
      analysis: `Forebet modeli: ${tip} (${prob}%)`,
      isHero: prob >= 80,
      today: true
    };
  } catch (e) {
    return null;
  }
}

function parseForebetFallback(html) {
  // Forebet'in script içinde JSON verisi varsa onu dene
  const picks = [];

  // Forebet bazen maç verilerini JS değişkeninde tutar
  const matchRegex = /homeTeam['"]?\s*[:=]\s*['"]([^'"]+)['"][\s\S]{0,500}?awayTeam['"]?\s*[:=]\s*['"]([^'"]+)['"]/g;
  let match;

  while ((match = matchRegex.exec(html)) !== null) {
    picks.push({
      id: `forebet_${match[1]}_${match[2]}`.replace(/\s+/g, "_"),
      source: "forebet",
      league: "Forebet",
      home: match[1],
      away: match[2],
      homeLogo: "",
      awayLogo: "",
      time: "",
      kickoff: "",
      tip: "1",
      odds: "",
      prob: 50,
      confidence: 50,
      analysis: "Forebet tahmini",
      isHero: false,
      today: true
    });
  }

  return picks;
}

function normalizeTip(tip) {
  if (!tip) return "";
  const t = tip.toLowerCase().trim();

  if (t === "1" || t === "home" || t === "ev") return "Home";
  if (t === "2" || t === "away" || t === "deplasman") return "Away";
  if (t === "x" || t === "draw" || t === "beraberlik") return "Draw";
  if (t === "1x" || t === "1 veya x") return "1X";
  if (t === "x2" || t === "x veya 2") return "X2";
  if (t === "12") return "12";
  if (t.includes("over") || t.includes("üst")) return "Over 2.5";
  if (t.includes("under") || t.includes("alt")) return "Under 2.5";
  if (t.includes("btts") || t.includes("kg var")) return "BTTS";

  return tip;
}


/* =====================================================
   TEKRAR TEMİZLE
===================================================== */

function removeDuplicates(picks) {
  const seen = new Set();
  return picks.filter(p => {
    const key = `${normalize(p.home)}|${normalize(p.away)}|${p.tip}`.toLowerCase();
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
