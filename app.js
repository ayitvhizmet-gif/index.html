/* =====================================================
   MAÇ KUPONLARI - APP.JS
===================================================== */

"use strict";


/* =====================================================
   DEĞİŞKENLER
===================================================== */

let allPicks = [];
let filteredPicks = [];
let activeFilter = "all";
let searchText = "";


/* =====================================================
   HTML ELEMENTLERİ
===================================================== */

const couponContainer = document.getElementById("couponContainer");
const noResults       = document.getElementById("noResults");
const resultCount     = document.getElementById("resultCount");
const searchInput     = document.getElementById("searchInput");
const loadingEl       = document.getElementById("loading");
const filterButtons   = document.querySelectorAll(".filter-btn");
const clearSearchBtn  = document.getElementById("clearSearch");


/* =====================================================
   YARDIMCI FONKSİYONLAR
===================================================== */

/* Türkçe karakterleri sadeleştirip küçük harfe çevirir */
function normalize(str) {
    return String(str || "")
        .toLowerCase()
        .replace(/ı/g, "i")
        .replace(/İ/g, "i")
        .replace(/ş/g, "s")
        .replace(/ğ/g, "g")
        .replace(/ü/g, "u")
        .replace(/ö/g, "o")
        .replace(/ç/g, "c")
        .trim();
}

/* HTML enjeksiyonuna karşı basit koruma */
function escapeHtml(str) {
    return String(str == null ? "" : str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* Tarihi gg.aa.yyyy biçimine çevirir */
function formatDate(value) {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);

    const gun = String(d.getDate()).padStart(2, "0");
    const ay  = String(d.getMonth() + 1).padStart(2, "0");
    const yil = d.getFullYear();
    const sa  = String(d.getHours()).padStart(2, "0");
    const dk  = String(d.getMinutes()).padStart(2, "0");

    return `${gun}.${ay}.${yil} ${sa}:${dk}`;
}

/* Durum bilgisini okunabilir etikete çevirir */
function statusInfo(status) {
    const s = normalize(status);

    if (s === "won"  || s === "kazandi"   || s === "1") return { text: "KAZANDI",   cls: "won"     };
    if (s === "lost" || s === "kaybetti"  || s === "0") return { text: "KAYBETTİ",  cls: "lost"    };
    if (s === "void" || s === "iptal")                  return { text: "İPTAL",     cls: "void"    };

    return { text: "DEVAM EDİYOR", cls: "pending" };
}

/* Güven puanını yıldıza çevirir (1-5) */
function confidenceStars(value) {
    let n = Number(value) || 0;

    /* 10 üzerinden gelirse 5'e indir */
    if (n > 5) n = Math.round(n / 2);

    n = Math.max(1, Math.min(5, n));

    return "★".repeat(n) + "☆".repeat(5 - n);
}


/* =====================================================
   KART OLUŞTURMA
===================================================== */

function createCard(pick) {
    const card = document.createElement("article");
    card.className = "coupon-card";

    const status  = statusInfo(pick.status);
    const stars   = confidenceStars(pick.confidence || pick.guven || 3);
    const oran    = pick.odds || pick.oran || "-";
    const tahmin  = pick.prediction || pick.tahmin || "";
    const lig     = pick.league || pick.lig || "";
    const ev      = pick.home || pick.evSahibi || "";
    const dep     = pick.away || pick.deplasman || "";
    const macSaati = formatDate(pick.date || pick.tarih || pick.matchDate);
    const analiz  = pick.analysis || pick.analiz || pick.note || "";
    const kategori = pick.category || pick.kategori || "genel";

    card.dataset.category = normalize(kategori);
    card.dataset.status   = status.cls;

    card.innerHTML = `
        <div class="card-top">
            <span class="league">${escapeHtml(lig)}</span>
            <span class="status ${status.cls}">${status.text}</span>
        </div>

        <div class="teams">
            <span class="team">${escapeHtml(ev)}</span>
            <span class="vs">-</span>
            <span class="team">${escapeHtml(dep)}</span>
        </div>

        <div class="card-mid">
            <div class="info-box">
                <span class="info-label">Tahmin</span>
                <span class="info-value">${escapeHtml(tahmin)}</span>
            </div>
            <div class="info-box">
                <span class="info-label">Oran</span>
                <span class="info-value odds">${escapeHtml(oran)}</span>
            </div>
        </div>

        ${analiz ? `<p class="analysis">${escapeHtml(analiz)}</p>` : ""}

        <div class="card-bottom">
            <span class="date">${escapeHtml(macSaati)}</span>
            <span class="stars" title="Güven: ${escapeHtml(stars)}">${stars}</span>
        </div>
    `;

    return card;
}


/* =====================================================
   FİLTRELEME
===================================================== */

function applyFilters() {
    const q = normalize(searchText);

    filteredPicks = allPicks.filter((pick) => {
        /* Kategori filtresi */
        if (activeFilter !== "all") {
            const kategori = normalize(pick.category || pick.kategori || "genel");
            if (kategori !== activeFilter) return false;
        }

        /* Arama filtresi */
        if (q) {
            const havuz = normalize([
                pick.league, pick.lig,
                pick.home, pick.evSahibi,
                pick.away, pick.deplasman,
                pick.prediction, pick.tahmin,
                pick.analysis, pick.analiz
            ].join(" "));

            if (!havuz.includes(q)) return false;
        }

        return true;
    });

    render();
}


/* =====================================================
   EKRANA ÇİZİM
===================================================== */

function render() {
    if (!couponContainer) return;

    couponContainer.innerHTML = "";

    /* Sonuç sayısı */
    if (resultCount) {
        resultCount.textContent = `${filteredPicks.length} kupon gösteriliyor`;
    }

    /* Sonuç yok */
    if (filteredPicks.length === 0) {
        if (noResults) noResults.hidden = false;
        return;
    }

    if (noResults) noResults.hidden = true;

    const fragment = document.createDocumentFragment();

    filteredPicks.forEach((pick) => {
        fragment.appendChild(createCard(pick));
    });

    couponContainer.appendChild(fragment);
}


/* =====================================================
   VERİ YÜKLEME
===================================================== */

async function loadPicks() {
    /* 1) data.js varsa onu kullan */
    if (Array.isArray(window.PICKS) && window.PICKS.length) {
        allPicks = window.PICKS;
        applyFilters();
        return;
    }

    /* 2) picks.json dosyasını dene */
    try {
        const res = await fetch("picks.json", { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);

        const data = await res.json();
        allPicks = Array.isArray(data) ? data : (data.picks || []);

        applyFilters();
    } catch (err) {
        console.error("Kuponlar yüklenemedi:", err);

        allPicks = [];
        filteredPicks = [];
        render();

        if (noResults) {
            noResults.hidden = false;
            noResults.textContent =
                "Kupon verisi yüklenemedi. picks.json dosyasını kontrol et.";
        }
    } finally {
        if (loadingEl) loadingEl.hidden = true;
    }
}


/* =====================================================
   OLAYLAR
===================================================== */

/* Arama kutusu */
if (searchInput) {
    searchInput.addEventListener("input", (e) => {
        searchText = e.target.value;

        if (clearSearchBtn) {
            clearSearchBtn.hidden = searchText.length === 0;
        }

        applyFilters();
    });
}

/* Aramayı temizle */
if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
        searchText = "";
        if (searchInput) {
            searchInput.value = "";
            searchInput.focus();
        }
        clearSearchBtn.hidden = true;
        applyFilters();
    });
}

/* Filtre butonları */
filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        filterButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        activeFilter = normalize(btn.dataset.filter || "all");
        applyFilters();
    });
});


/* =====================================================
   BAŞLAT
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
    if (loadingEl) loadingEl.hidden = false;
    loadPicks();
});
