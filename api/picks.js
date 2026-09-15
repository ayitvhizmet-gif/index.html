const SOURCE_URL = "https://footeoplay.com/tr/picks";

export default async function handler(req, res) {
  try {
    const response = await fetch(SOURCE_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache"
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
    const picks = parseFooteo(html);

    return res.status(200).json({
      success: true,
      source: SOURCE_URL,
      updated_at: new Date().toISOString(),
      count: picks.length,
      picks: picks
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
   FOOTEO PARSER - Next.js JSON verisini okur
===================================================== */

function parseFooteo(html) {
  const picks = [];

  try {
    // Next.js'in sayfaya gömdüğü script bloklarını bul
    const scriptRegex = /<script>self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)<\/script>/g;
    let match;

    while ((match = scriptRegex.exec(html)) !== null) {
      const content = match[1];

      // "initialPicks" içeren bloğu ara
      if (content.includes('initialPicks')) {
        // String içindeki kaçış karakterlerini çöz
        const unescaped = content
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\')
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t');

        // "initialPicks":[...] kısmını yakala
        const picksMatch = unescaped.match(/"initialPicks":\s*(\[[\s\S]*?\])(?:,"|\})/);

        if (picksMatch) {
          const picksJson = picksMatch[1];

          try {
            const rawPicks = JSON.parse(picksJson);

            rawPicks.forEach(item => {
              picks.push({
                id: item.id || "",
                league: item.league || "",
                leagueSlug: item.leagueSlug || "",
                home: item.home || "",
                away: item.away || "",
                homeInitials: item.homeInitials || "",
                awayInitials: item.awayInitials || "",
                homeLogo: item.homeLogo || "",
                awayLogo: item.awayLogo || "",
                time: item.time || "",
                kickoff: item.kickoff || "",
                tip: item.tip || "",
                odds: item.odds || "",
                prob: item.prob || 0,
                confidence: item.prob || 0,
                day: item.day || "today",
                slug: item.slug || "",
                analysis: item.analysis || "",
                isHero: item.isHero || false,
                today: true
              });
            });
          } catch (jsonErr) {
            console.error("JSON parse hatası:", jsonErr.message);
          }
        }
        break;
      }
    }
  } catch (err) {
    console.error("Parser hatası:", err.message);
  }

  return picks;
}
