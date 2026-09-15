const SOURCE_URL = "https://footeoplay.com/tr/picks";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  try {
    const response = await fetch(SOURCE_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        error: "Kaynak siteye ulaşılamadı.",
        status: response.status
      });
    }

    const html = await response.text();
    const result = parseFooteo(html);

    return res.status(200).json({
      success: true,
      source: SOURCE_URL,
      updated_at: new Date().toISOString(),
      count: result.picks.length,
      debug: result.debug,
      picks: result.picks
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: "API çalışırken hata oluştu.",
      message: error.message
    });
  }
}


/* =====================================================
   FOOTEO PARSER
   Next.js'in gömülü JSON verisini okur
===================================================== */

function parseFooteo(html) {
  const picks = [];

  const debug = {
    htmlLength: html.length,
    scriptsFound: 0,
    initialPicksFound: false,
    parseErrors: []
  };

  // self.__next_f.push([1,"..."]) bloklarını yakala
  const regex = /self\.__next_f\.push\s*\(\s*\[\s*\d+\s*,\s*("(?:[^"\\]|\\.)*")\s*\]\s*\)/g;

  let match;

  while ((match = regex.exec(html)) !== null) {
    debug.scriptsFound++;

    // JS string literal'ı gerçek string'e çevir
    let str;
    try {
      str = JSON.parse(match[1]);
    } catch (e) {
      debug.parseErrors.push("Outer: " + e.message);
      continue;
    }

    // Bu blokta initialPicks var mı?
    const idx = str.indexOf('"initialPicks":');
    if (idx === -1) continue;

    debug.initialPicksFound = true;

    // initialPicks array'inin başlangıcı
    const arrayStart = str.indexOf('[', idx);
    if (arrayStart === -1) continue;

    // Dengeli parantez eşleştirme
    let depth = 0;
    let inString = false;
    let escaped = false;
    let end = -1;

    for (let i = arrayStart; i < str.length; i++) {
      const ch = str[i];

      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;

      if (ch === '[') depth++;
      else if (ch === ']') {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }

    if (end === -1) {
      debug.parseErrors.push("No matching bracket");
      continue;
    }

    // JSON array'i çıkar
    const jsonStr = str.substring(arrayStart, end + 1);

    try {
      const arr = JSON.parse(jsonStr);

      arr.forEach(item => {
        picks.push({
          id:         item.id || "",
          league:     item.league || "",
          leagueSlug: item.leagueSlug || "",
          home:       item.home || "",
          away:       item.away || "",
          homeLogo:   item.homeLogo || "",
          awayLogo:   item.awayLogo || "",
          time:       item.time || "",
          kickoff:    item.kickoff || "",
          tip:        item.tip || "",
          odds:       String(item.odds || ""),
          prob:       item.prob || 0,
          confidence: item.prob || 0,
          day:        item.day || "today",
          slug:       item.slug || "",
          analysis:   item.analysis || "",
          isHero:     item.isHero || false,
          today:      true
        });
      });

      // Başarıyla bulundu, döngüden çık
      break;

    } catch (e) {
      debug.parseErrors.push("Array: " + e.message);
    }
  }

  return { picks, debug };
}
