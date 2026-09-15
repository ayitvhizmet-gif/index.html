const SOURCE_URL = "https://footeoplay.com/tr/picks";

export default async function handler(req, res) {

    try {

        const response = await fetch(SOURCE_URL, {
            method: "GET",

            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",

                "Accept":
                    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

                "Accept-Language":
                    "tr-TR,tr;q=0.9,en;q=0.8"
            },

            cache: "no-store"
        });


        if (!response.ok) {

            return res.status(502).json({

                success: false,

                error:
                    "Kaynak siteye ulaşılamadı.",

                status:
                    response.status

            });

        }


        const html =
            await response.text();


        /*
        =====================================================
        FOOTEО HTML VERİLERİNİ OKUMA
        =====================================================
        */

        const picks =
            parseFooteo(html);


        /*
        =====================================================
        SONUÇ
        =====================================================
        */

        return res.status(200).json({

            success: true,

            source: SOURCE_URL,

            updated_at:
                new Date().toISOString(),

            count:
                picks.length,

            picks:
                picks

        });


    } catch (error) {

        console.error(error);


        return res.status(500).json({

            success: false,

            error:
                "API çalışırken hata oluştu.",

            message:
                error.message

        });

    }

}


/*
=========================================================
FOOTEO PARSER
=========================================================
*/

function parseFooteo(html) {

    const results = [];


    /*
    ---------------------------------------------------------
    Script ve style bölümlerini temizle
    ---------------------------------------------------------
    */

    let clean =
        html
            .replace(
                /<script[\s\S]*?<\/script>/gi,
                " "
            )

            .replace(
                /<style[\s\S]*?<\/style>/gi,
                " "
            );


    /*
    ---------------------------------------------------------
    HTML etiketlerini temizle
    ---------------------------------------------------------
    */

    clean =
        clean
            .replace(
                /<[^>]+>/g,
                " "
            )

            .replace(
                /&nbsp;/gi,
                " "
            )

            .replace(
                /&amp;/gi,
                "&"
            )

            .replace(
                /&quot;/gi,
                '"'
            )

            .replace(
                /&#39;/gi,
                "'"
            )

            .replace(
                /\s+/g,
                " "
            )

            .trim();


    /*
    ---------------------------------------------------------
    Türkçe tarih/saat vb. metinleri kontrol et
    ---------------------------------------------------------
    */

    const timeRegex =
        /\b([01]?\d|2[0-3]):[0-5]\d\b/g;


    let match;


    while (
        (match =
            timeRegex.exec(clean)) !== null
    ) {


        const time =
            match[0];


        /*
        -----------------------------------------------------
        Saatin etrafındaki alan
        -----------------------------------------------------
        */

        const start =
            Math.max(
                0,
                match.index - 400
            );


        const end =
            Math.min(
                clean.length,
                match.index + 500
            );


        const area =
            clean.substring(
                start,
                end
            );


        /*
        -----------------------------------------------------
        Oran
        -----------------------------------------------------
        */

        const oddsMatch =
            area.match(
                /(?:oran|odds)\s*:?\s*(\d+(?:[.,]\d+)?)/i
            );


        const odds =
            oddsMatch
                ? oddsMatch[1].replace(",", ".")
                : "";


        /*
        -----------------------------------------------------
        Güven
        -----------------------------------------------------
        */

        const confidenceMatch =
            area.match(
                /(?:güven|confidence)\s*:?\s*(\d{1,3})\s*%?/i
            );


        const confidence =
            confidenceMatch
                ? confidenceMatch[1]
                : "";


        /*
        -----------------------------------------------------
        Takım isimlerini bulmaya çalış
        -----------------------------------------------------
        */

        const teamMatch =
            findTeams(area);


        if (
            !teamMatch
        ) {

            continue;

        }


        /*
        -----------------------------------------------------
        Tahmin
        -----------------------------------------------------
        */

        const pick =
            findPrediction(area);


        /*
        -----------------------------------------------------
        Lig
        -----------------------------------------------------
        */

        const league =
            findLeague(area);


        /*
        -----------------------------------------------------
        Banko
        -----------------------------------------------------
        */

        const banko =
            /banko|sure|safe|strong/i
                .test(area);


        results.push({

            home:
                teamMatch.home,

            away:
                teamMatch.away,

            league:
                league,

            time:
                time,

            date:
                "",

            pick:
                pick,

            odds:
                odds,

            confidence:
                confidence,

            banko:
                banko,

            today:
                true

        });

    }


    /*
    ---------------------------------------------------------
    Aynı maçları tekrar etme
    ---------------------------------------------------------
    */

    return removeDuplicates(
        results
    );

}


/*
=========================================================
TAKIMLARI BUL
=========================================================
*/

function findTeams(text) {

    /*
    Örnek:

    Team A - Team B

    Team A vs Team B

    Team A – Team B
    */


    const patterns = [

        /([A-Za-zÀ-ÿ0-9'’.\-& ]{2,60})\s+(?:vs|VS|v)\s+([A-Za-zÀ-ÿ0-9'’.\-& ]{2,60})/,

        /([A-Za-zÀ-ÿ0-9'’.\-& ]{2,60})\s+[—–-]\s+([A-Za-zÀ-ÿ0-9'’.\-& ]{2,60})/

    ];


    for (
        const pattern
        of patterns
    ) {

        const match =
            text.match(pattern);


        if (
            match
        ) {

            return {

                home:
                    cleanTeam(match[1]),

                away:
                    cleanTeam(match[2])

            };

        }

    }


    return null;

}


/*
=========================================================
TAHMİNİ BUL
=========================================================
*/

function findPrediction(text) {

    const patterns = [

        /(?:tahmin|prediction|pick)\s*:?\s*([A-Za-z0-9+\/XxÜüŞşİıÖöÇç.\- ]{1,30})/i,

        /\b(1X|X2|12|MS\s*1|MS\s*2|KG\s*VAR|KG\s*YOK|OVER\s*2\.5|UNDER\s*2\.5|\+1\.5|-1\.5)\b/i

    ];


    for (
        const pattern
        of patterns
    ) {

        const match =
            text.match(pattern);


        if (
            match
        ) {

            return match[1]
                .trim();

        }

    }


    return "";

}


/*
=========================================================
LİGİ BUL
=========================================================
*/

function findLeague(text) {

    const patterns = [

        /(?:lig|league)\s*:?\s*([^|]{3,80})/i,

        /(England|Spain|Italy|Germany|France|Turkey|Türkiye)[^|]{0,60}/i

    ];


    for (
        const pattern
        of patterns
    ) {

        const match =
            text.match(pattern);


        if (
            match
        ) {

            return match[1]
                .trim();

        }

    }


    return "";

}


/*
=========================================================
TAKIM TEMİZLE
=========================================================
*/

function cleanTeam(text) {

    return text

        .replace(
            /\b(?:oran|odds|güven|confidence|tahmin|prediction)\b.*$/i,
            ""
        )

        .replace(
            /\s+/g,
            " "
        )

        .trim()

        .substring(
            0,
            60
        );

}


/*
=========================================================
TEKRARLARI TEMİZLE
=========================================================
*/

function removeDuplicates(items) {

    const seen =
        new Set();


    return items.filter(
        item => {

            const key =
                (
                    item.home +
                    "|" +
                    item.away +
                    "|" +
                    item.time
                )
                    .toLowerCase();


            if (
                seen.has(key)
            ) {

                return false;

            }


            seen.add(key);

            return true;

        }
    );

}
