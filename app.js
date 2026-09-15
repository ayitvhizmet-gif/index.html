/* =====================================================
   MAÇ KUPONLARI - APP.JS
===================================================== */

"use strict";


/* =====================================================
   DEĞİŞKENLER
===================================================== */

let allPicks = [];

let activeFilter = "all";

let searchText = "";


/* =====================================================
   HTML ELEMENTLERİ
===================================================== */

const couponContainer =
    document.getElementById("couponContainer");

const noResults =
    document.getElementById("noResults");

const resultCount =
    document.getElementById("resultCount");

const matchCount =
    document.getElementById("matchCount");

const dataStatus =
    document.getElementById("dataStatus");

const statusMessage =
    document.getElementById("statusMessage");

const statusIndicator =
    document.getElementById("statusIndicator");

const lastUpdate =
    document.getElementById("lastUpdate");

const todayDate =
    document.getElementById("todayDate");

const searchInput =
    document.getElementById("searchInput");

const refreshButton =
    document.getElementById("refreshButton");


/* =====================================================
   TARİH
===================================================== */

function showToday() {

    const now = new Date();

    const date = now.toLocaleDateString(
        "tr-TR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );

    if (todayDate) {
        todayDate.textContent = date;
    }

}


/* =====================================================
   SAYIYA ÇEVİR
===================================================== */

function getNumber(value) {

    if (value === null ||
        value === undefined) {

        return 0;
    }

    const number =
        parseInt(
            String(value)
                .replace(",", ".")
                .replace("%", "")
                .replace(/[^\d.]/g, ""),
            10
        );

    if (Number.isNaN(number)) {
        return 0;
    }

    return number;

}


/* =====================================================
   HTML GÜVENLİĞİ
===================================================== */

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =====================================================
   API'DEN VERİ AL
===================================================== */

async function loadPicks() {

    setLoadingState();

    try {

        const response =
            await fetch(
                "/api/picks?time=" +
                Date.now(),
                {
                    method: "GET",

                    cache: "no-store",

                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );


        if (!response.ok) {

            throw new Error(
                "API Hatası: " +
                response.status
            );

        }


        const result =
            await response.json();


        if (
            !result ||
            !Array.isArray(result.picks)
        ) {

            throw new Error(
                "Geçerli kupon verisi bulunamadı."
            );

        }


        allPicks =
            result.picks;


        updateOnlineState(
            result
        );


        renderPicks();


    } catch (error) {

        console.error(
            "Kupon verisi alınamadı:",
            error
        );


        setErrorState(
            error
        );

    }

}


/* =====================================================
   YÜKLENİYOR
===================================================== */

function setLoadingState() {

    if (statusMessage) {

        statusMessage.textContent =
            "Veriler yükleniyor...";

    }


    if (dataStatus) {

        dataStatus.textContent =
            "Yükleniyor";

    }


    if (statusIndicator) {

        statusIndicator.className =
            "status-indicator loading";

    }


    if (couponContainer) {

        couponContainer.innerHTML = `

            <div class="loading-card">

                <div class="loading-spinner">
                    ⚽
                </div>

                <h3>
                    Kuponlar hazırlanıyor...
                </h3>

                <p>
                    Güncel tahminler kontrol ediliyor.
                </p>

            </div>

        `;

    }

}


/* =====================================================
   BAĞLANTI BAŞARILI
===================================================== */

function updateOnlineState(result) {

    if (statusMessage) {

        statusMessage.textContent =
            "Veriler başarıyla alındı.";

    }


    if (dataStatus) {

        dataStatus.textContent =
            "Aktif";

    }


    if (statusIndicator) {

        statusIndicator.className =
            "status-indicator online";

    }


    if (matchCount) {

        matchCount.textContent =
            allPicks.length +
            " maç";

    }


    if (lastUpdate) {

        if (result.updated_at) {

            const date =
                new Date(
                    result.updated_at
                );


            lastUpdate.textContent =
                "Son güncelleme: " +
                date.toLocaleString(
                    "tr-TR"
                );

        } else {

            lastUpdate.textContent =
                "Az önce güncellendi";

        }

    }

}


/* =====================================================
   HATA DURUMU
===================================================== */

function setErrorState(error) {

    if (statusMessage) {

        statusMessage.textContent =
            "Veriler alınamadı.";

    }


    if (dataStatus) {

        dataStatus.textContent =
            "Hata";

    }


    if (statusIndicator) {

        statusIndicator.className =
            "status-indicator error";

    }


    if (matchCount) {

        matchCount.textContent =
            "0 maç";

    }


    if (couponContainer) {

        couponContainer.innerHTML = `

            <div class="loading-card">

                <div class="loading-spinner">
                    ⚠️
                </div>

                <h3>
                    Kuponlar alınamadı
                </h3>

                <p>
                    Veri kaynağına şu anda
                    ulaşılamıyor.
                </p>

                <button
                    onclick="loadPicks()"
                    style="
                        margin-top:15px;
                        padding:10px 15px;
                        border:0;
                        border-radius:10px;
                        cursor:pointer;
                        font-weight:800;
                    "
                >
                    ↻ Tekrar Dene
                </button>

            </div>

        `;

    }

}


/* =====================================================
   FİLTRELEME
===================================================== */

function filterPicks() {

    let filtered =
        [...allPicks];


    /* -----------------------------
       BANKO
    ----------------------------- */

    if (activeFilter === "banko") {

        filtered =
            filtered.filter(
                pick =>
                    pick.banko === true ||
                    pick.banko === "true"
            );

    }


    /* -----------------------------
       %75 VE ÜZERİ
    ----------------------------- */

    if (activeFilter === "high") {

        filtered =
            filtered.filter(
                pick =>
                    getNumber(
                        pick.confidence
                    ) >= 75
            );

    }


    /* -----------------------------
       BUGÜN
    ----------------------------- */

    if (activeFilter === "today") {

        filtered =
            filtered.filter(
                pick =>
                    pick.today !== false
            );

    }


    /* -----------------------------
       ARAMA
    ----------------------------- */

    if (searchText.length > 0) {

        const search =
            searchText.toLocaleLowerCase(
                "tr-TR"
            );


        filtered =
            filtered.filter(
                pick => {

                    const home =
                        String(
                            pick.home || ""
                        ).toLocaleLowerCase(
                            "tr-TR"
                        );


                    const away =
                        String(
                            pick.away || ""
                        ).toLocaleLowerCase(
                            "tr-TR"
                        );


                    const league =
                        String(
                            pick.league || ""
                        ).toLocaleLowerCase(
                            "tr-TR"
                        );


                    return (

                        home.includes(search) ||

                        away.includes(search) ||

                        league.includes(search)

                    );

                }
            );

    }


    return filtered;

}


/* =====================================================
   KUPONLARI EKRANA BAS
===================================================== */

function renderPicks() {

    const filtered =
        filterPicks();


    if (resultCount) {

        resultCount.textContent =
            filtered.length +
            " MAÇ";

    }


    if (filtered.length === 0) {

        if (couponContainer) {

            couponContainer.innerHTML =
                "";

        }


        if (noResults) {

            noResults.style.display =
                "block";

        }


        return;

    }


    if (noResults) {

        noResults.style.display =
            "none";

    }


    if (!couponContainer) {

        return;

    }


    couponContainer.innerHTML =
        filtered
            .map(
                (pick, index) =>
                    createCouponCard(
                        pick,
                        index
                    )
            )
            .join("");

}


/* =====================================================
   KUPON KARTI
===================================================== */

function createCouponCard(
    pick,
    index
) {

    const home =
        escapeHTML(
            pick.home ||
            "Ev Sahibi"
        );


    const away =
        escapeHTML(
            pick.away ||
            "Deplasman"
        );


    const league =
        escapeHTML(
            pick.league ||
            "Lig bilgisi yok"
        );


    const time =
        escapeHTML(
            pick.time ||
            "--:--"
        );


    const date =
        escapeHTML(
            pick.date ||
            ""
        );


    const prediction =
        escapeHTML(
            pick.pick ||
            "-"
        );


    const odds =
        escapeHTML(
            pick.odds ||
            "-"
        );


    const confidence =
        Math.min(
            100,
            Math.max(
                0,
                getNumber(
                    pick.confidence
                )
            )
        );


    const isBanko =
        pick.banko === true ||
        pick.banko === "true";


    return `

        <article
            class="coupon-card"
            data-index="${index}"
        >


            <!-- LİG / SAAT -->

            <div class="coupon-top">

                <div class="league">

                    ${league}

                </div>


                <div class="match-time">

                    🕐 ${time}

                </div>

            </div>


            <!-- TAKIMLAR -->

            <div class="teams">


                <div class="team">

                    ${home}

                </div>


                <div class="vs">

                    VS

                </div>


                <div class="team">

                    ${away}

                </div>


            </div>


            <!-- TAHMİN / ORAN -->

            <div class="pick-area">


                <div class="pick-box">

                    <span class="pick-label">

                        TAHMİN

                    </span>


                    <span class="pick-value">

                        🎯 ${prediction}

                    </span>

                </div>


                <div class="odds-box">

                    <span class="odds-label">

                        ORAN

                    </span>


                    <span class="odds-value">

                        ${odds}

                    </span>

                </div>


            </div>


            <!-- GÜVEN -->

            <div class="confidence-area">


                <div class="confidence-head">


                    <span
                        class="confidence-label"
                    >

                        GÜVEN ORANI

                    </span>


                    <span
                        class="confidence-value"
                    >

                        %${confidence}

                    </span>


                </div>


                <div class="confidence-bar">

                    <div
                        class="confidence-fill"
                        style="
                            width:${confidence}%;
                        "
                    ></div>

                </div>


            </div>


            ${
                isBanko

                ?

                `
                <div class="banko-badge">

                    🔥 BANKO TAHMİN

                </div>
                `

                :

                ""
            }


        </article>

    `;

}


/* =====================================================
   FİLTRE BUTONLARI
===================================================== */

function setupFilters() {

    const buttons =
        document.querySelectorAll(
            ".filter-button"
        );


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {


                    buttons.forEach(
                        item => {

                            item.classList.remove(
                                "active"
                            );

                        }
                    );


                    button.classList.add(
                        "active"
                    );


                    activeFilter =
                        button.dataset.filter ||
                        "all";


                    renderPicks();

                }
            );

        }
    );

}


/* =====================================================
   ARAMA
===================================================== */

function setupSearch() {

    if (!searchInput) {

        return;

    }


    searchInput.addEventListener(
        "input",
        event => {

            searchText =
                event.target.value.trim();


            renderPicks();

        }
    );

}


/* =====================================================
   YENİLE BUTONU
===================================================== */

function setupRefresh() {

    if (!refreshButton) {

        return;

    }


    refreshButton.addEventListener(
        "click",
        async () => {

            refreshButton.disabled =
                true;


            refreshButton.innerHTML =
                "⏳ YÜKLENİYOR";


            await loadPicks();


            refreshButton.disabled =
                false;


            refreshButton.innerHTML =
                '<span class="refresh-icon">↻</span> YENİLE';

        }
    );

}


/* =====================================================
   OTOMATİK YENİLEME
===================================================== */

function setupAutoRefresh() {

    /*
       Her 30 dakikada API tekrar kontrol edilir.
       Böylece sayfayı açık tutan kullanıcıların
       verileri güncel kalır.
    */

    setInterval(
        () => {

            loadPicks();

        },
        30 * 60 * 1000
    );

}


/* =====================================================
   BAŞLAT
===================================================== */

function init() {

    showToday();

    setupFilters();

    setupSearch();

    setupRefresh();

    setupAutoRefresh();

    loadPicks();

}


/* =====================================================
   SAYFA HAZIR
===================================================== */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        init
    );

} else {

    init();

}
