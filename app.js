/* =====================================================
   MAÇ KUPONLARI - APP.JS
   Tema + Favoriler + Geri Sayım + Logolar
===================================================== */

"use strict";


/* =====================================================
   DEĞİŞKENLER
===================================================== */

let allPicks = [];
let filteredPicks = [];
let activeFilter = "all";
let searchText = "";
let favorites = new Set();
let countdownTimer = null;

const FAV_KEY = "coupon_favorites";
const THEME_KEY = "coupon_theme";


/* =====================================================
   HTML ELEMENTLERİ
===================================================== */

const couponContainer = document.getElementById("couponContainer");
const noResults       = document.getElementById("noResults");
const resultCount     = document.getElementById("resultCount");
const searchInput     = document.getElementById("searchInput");
const filterButtons   = document.querySelectorAll(".filter-button");
const refreshButton   = document.getElementById("refreshButton");
const themeToggle     = document.getElementById("themeToggle");
const todayDate       = document.getElementById("todayDate");
const dataStatus      = document.getElementById("dataStatus");
const matchCount      = document.getElementById("matchCount");
const statusIndicator = document.getElementById("statusIndicator");
const statusMessage   = document.getElementById("statusMessage");
const lastUpdate      = document.getElementById("lastUpdate");
const favCount        = document.getElementById("favCount");


/* =====================================================
   TEMA
===================================================== */

function loadTheme() {
    let saved = "dark";
    try { saved = localStorage.getItem(THEME_KEY) || "dark"; } catch (e) {}
    document.documentElement.dataset.theme = saved;
    updateThemeIcon(saved);
}

function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    updateThemeIcon(theme);
}

function updateThemeIcon(theme) {
    const icon = document.querySelector(".theme-icon");
    if (icon) icon.textContent = theme === "light" ? "☀️" : "🌙";
}

function toggleTheme() {
    const current = document.documentElement.dataset.theme || "dark";
    setTheme(current === "dark" ? "light" : "dark");
}


/* =====================================================
   FAVORİLER
===================================================== */

function loadFavorites() {
    try {
        const raw = localStorage.getItem(FAV_KEY);
        if (raw) favorites = new Set(JSON.parse(raw));
    } catch (e) { favorites = new Set(); }
}

function saveFavorites() {
    try {
        localStorage.setItem(FAV_KEY, JSON.stringify([...favorites]));
    } catch (e) {}
}

function toggleFavorite(id) {
    if (!id) return;
    if (favorites.has(id)) {
        favorites.delete(id);
    } else {
        favorites.add(id);
    }
    saveFavorites();
    updateFavCount();
    applyFilters();
}

function updateFavCount() {
    if (favCount) {
        favCount.textContent = favorites.size > 0 ? favorites.size : "";
    }
}


/* =====================================================
   YARDIMCI FONKSİYONLAR
===================================================== */

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

function escapeHtml(str) {
    return String(str == null ? "" : str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(value) {
    if (!value) return "";
    if (/^\d{1,2}:\d{2}$/.test(String(value))) return String(value);

    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);

    const gun = String(d.getDate()).padStart(2, "0");
    const ay  = String(d.getMonth() + 1).padStart(2, "0");
    const yil = d.getFullYear();
    const sa  = String(d.getHours()).padStart(2, "0");
    const dk  = String(d.getMinutes()).padStart(2, "0");

    return `${gun}.${ay}.${yil} ${sa}:${dk}`;
}

function formatToday() {
    const aylar = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
                   "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
    const d = new Date();
    return `${d.getDate()} ${aylar[d.getMonth()]} ${d.getFullYear()}`;
}

function statusInfo(status) {
    const s = normalize(status);
    if (s === "won"  || s === "kazandi"  || s === "1") return { text: "KAZANDI",  cls: "won"  };
    if (s === "lost" || s === "kaybetti" || s === "0") return { text: "KAYBETTİ", cls: "lost" };
    if (s === "void" || s === "iptal")                 return { text: "İPTAL",    cls: "void" };
    return { text: "DEVAM EDİYOR", cls: "pending" };
}

function confidenceStars(value) {
    let n = Number(value) || 0;
    if (n > 10) n = Math.round(n / 20);
    else if (n > 5) n = Math.round(n / 2);
    n = Math.max(1, Math.min(5, n));
    return "★".repeat(n) + "☆".repeat(5 - n);
}

function getConfidence(pick) {
    const raw = Number(pick.prob || pick.confidence || pick.guven || 0);
    if (!raw) return 0;
    if (raw <= 5)  return raw * 20;
    if (raw <= 10) return raw * 10;
    return raw;
}


/* =====================================================
   GERİ SAYIM
===================================================== */

function getCountdown(kickoff) {
    if (!kickoff) return "";

    const t = new Date(kickoff).getTime();
    if (isNaN(t)) return "";

    const diff = t - Date.now();

    if (diff <= 0) return "🔴 Başladı";

    const totalMin = Math.floor(diff / 60000);
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}g ${hours % 24}s`;
    if (hours > 0) return `${hours}s ${mins}dk`;
    return `${mins} dk`;
}

function updateCountdowns() {
    document.querySelectorAll(".countdown[data-kickoff]").forEach(el => {
        el.textContent = getCountdown(el.dataset.kickoff);
    });
}

function startCountdownTimer() {
    if (countdownTimer) clearInterval(countdownTimer);
    updateCountdowns();
    countdownTimer = setInterval(updateCountdowns, 30000);
}


/* =====================================================
   KART OLUŞTURMA
===================================================== */

function createCard(pick) {
    const card = document.createElement("article");
    card.className = "coupon-card";

    const pickId   = pick.id || `${pick.home}-${pick.away}-${pick.time}`;
    const isFav    = favorites.has(pickId);
    const status   = statusInfo(pick.status);
    const stars    = confidenceStars(getConfidence(pick));
    const oran     = pick.odds || pick.oran || "-";
    const tahmin   = pick.tip || pick.pick || pick.prediction || pick.tahmin || "";
    const lig      = pick.league || pick.lig || "";
    const ev       = pick.home || pick.evSahibi || "";
    const dep      = pick.away || pick.deplasman || "";
    const homeLogo = pick.homeLogo || "";
    const awayLogo = pick.awayLogo || "";
    const kickoff  = pick.kickoff || "";
    const macSaati = formatDate(pick.time || pick.date || pick.tarih || "");
    const analiz   = pick.analysis || pick.analiz || "";

    const isBanko  = pick.isHero === true || getConfidence(pick) >= 85;
    const kategori = isBanko ? "banko" : "genel";

    card.dataset.category = normalize(kategori);
    card.dataset.status   = status.cls;

    const bankoBadge = isBanko
        ? `<span class="banko-badge">BANKO</span>` : "";

    const homeLogoHtml = homeLogo
        ? `<img src="${escapeHtml(homeLogo)}" class="team-logo" alt="" loading="lazy"
             onerror="this.style.display='none'">` : "";

    const awayLogoHtml = awayLogo
        ? `<img src="${escapeHtml(awayLogo)}" class="team-logo" alt="" loading="lazy"
             onerror="this.style.display='none'">` : "";

    const countdownHtml = kickoff
        ? `<div class="countdown-box">
             <span class="countdown-label">⏱️ KALAN SÜRE</span>
             <span class="countdown" data-kickoff="${escapeHtml(kickoff)}">${getCountdown(kickoff)}</span>
           </div>` : "";

    card.innerHTML = `
        <button class="favorite-btn ${isFav ? "active" : ""}"
                data-id="${escapeHtml(pickId)}"
                type="button"
                title="${isFav ? "Favorilerden çıkar" : "Favorilere ekle"}">
            ${isFav ? "★" : "☆"}
        </button>

        <div class="card-top">
            <span class="league">${escapeHtml(lig)}</span>
            ${bankoBadge}
            <span class="status ${status.cls}">${status.text}</span>
        </div>

        <div class="teams">
            <div class="team">
                ${homeLogoHtml}
                <span class="team-name">${escapeHtml(ev)}</span>
            </div>
            <span class="vs">-</span>
            <div class="team">
                ${awayLogoHtml}
                <span class="team-name">${escapeHtml(dep)}</span>
            </div>
        </div>

        <div class="card-mid">
            <div class="info-box">
                <span class="info-label">TAHMİN</span>
                <span class="info-value">${escapeHtml(tahmin)}</span>
            </div>
            <div class="info-box">
                <span class="info-label">ORAN</span>
                <span class="info-value odds">${escapeHtml(oran)}</span>
            </div>
        </div>

        ${countdownHtml}
        ${analiz ? `<p class="analysis">${escapeHtml(analiz)}</p>` : ""}

        <div class="card-bottom">
            <span class="date">${escapeHtml(macSaati)}</span>
            <span class="stars" title="Güven: %${getConfidence(pick)}">${stars}</span>
        </div>
    `;

    // Favori butonu dinleyicisi
    const favBtn = card.querySelector(".favorite-btn");
    if (favBtn) {
        favBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(pickId);
        });
    }

    return card;
}


/* =====================================================
   FİLTRELEME
===================================================== */

function applyFilters() {
    const q = normalize(searchText);

    filteredPicks = allPicks.filter((pick) => {
        const pickId = pick.id || `${pick.home}-${pick.away}-${pick.time}`;

        if (activeFilter !== "all") {
            if (activeFilter === "banko") {
                const isBanko = pick.isHero === true || getConfidence(pick) >= 85;
                if (!isBanko) return false;
            }
            else if (activeFilter === "high") {
                if (getConfidence(pick) < 75) return false;
            }
            else if (activeFilter === "today") {
                if (pick.today === false) return false;
            }
            else if (activeFilter === "favorites") {
                if (!favorites.has(pickId)) return false;
            }
            else {
                const kategori = normalize(pick.category || pick.kategori || "genel");
                if (kategori !== activeFilter) return false;
            }
        }

        if (q) {
            const havuz = normalize([
                pick.league, pick.lig,
                pick.home, pick.evSahibi,
                pick.away, pick.deplasman,
                pick.tip, pick.pick, pick.prediction, pick.tahmin,
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

    if (resultCount) {
        resultCount.textContent = `${filteredPicks.length} MAÇ`;
    }

    if (matchCount) {
        matchCount.textContent = String(filteredPicks.length);
    }

    if (filteredPicks.length === 0) {
        if (noResults) noResults.style.display = "block";
        return;
    }

    if (noResults) noResults.style.display = "none";

    const fragment = document.createDocumentFragment();
    filteredPicks.forEach(pick => {
        fragment.appendChild(createCard(pick));
    });
    couponContainer.appendChild(fragment);

    startCountdownTimer();
}


/* =====================================================
   DURUM
===================================================== */

function setStatus(type, message) {
    if (statusIndicator) statusIndicator.className = "status-indicator " + type;
    if (statusMessage) statusMessage.textContent = message;
    if (dataStatus) {
        dataStatus.textContent =
            type === "success" ? "Güncel" :
            type === "error"   ? "Hata"   : "Yükleniyor...";
    }
}

function setLastUpdate() {
    if (!lastUpdate) return;
    const d = new Date();
    const sa = String(d.getHours()).padStart(2, "0");
    const dk = String(d.getMinutes()).padStart(2, "0");
    lastUpdate.textContent = `Son güncelleme: ${sa}:${dk}`;
}


/* =====================================================
   VERİ YÜKLEME
===================================================== */

async function loadPicks() {
    setStatus("loading", "Veriler yükleniyor...");

    couponContainer.innerHTML = `
        <div class="loading-card">
            <div class="loading-spinner">⚽</div>
            <h3>Kuponlar hazırlanıyor...</h3>
            <p>Güncel tahminler kontrol ediliyor.</p>
        </div>
    `;

    try {
        const res = await fetch("/api/picks", { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);

        const data = await res.json();
        if (data && data.success === false) {
            throw new Error(data.error || "API hata döndü");
        }

        allPicks = Array.isArray(data) ? data : (data.picks || []);

        applyFilters();
        updateFavCount();

        setStatus("success", `${allPicks.length} maç başarıyla yüklendi`);
        setLastUpdate();

    } catch (err) {
        console.error("Kuponlar yüklenemedi:", err);

        allPicks = [];
        filteredPicks = [];
        couponContainer.innerHTML = "";
        render();

        setStatus("error", "Veriler yüklenemedi");

        if (noResults) {
            noResults.style.display = "block";
            noResults.innerHTML = `
                <div class="no-results-icon">⚠️</div>
                <h3>Kupon verisi yüklenemedi</h3>
                <p>API çalışmıyor olabilir. Lütfen tekrar deneyin.</p>
            `;
        }
    }
}


/* =====================================================
   OLAYLAR
===================================================== */

if (todayDate) todayDate.textContent = formatToday();

if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
}

if (searchInput) {
    searchInput.addEventListener("input", (e) => {
        searchText = e.target.value;
        applyFilters();
    });
}

filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        filterButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        activeFilter = normalize(btn.dataset.filter || "all");
        applyFilters();
    });
});

if (refreshButton) {
    refreshButton.addEventListener("click", () => {
        refreshButton.disabled = true;
        const icon = refreshButton.querySelector(".refresh-icon");
        if (icon) icon.textContent = "⏳";
        loadPicks().finally(() => {
            refreshButton.disabled = false;
            if (icon) icon.textContent = "↻";
        });
    });
}


/* =====================================================
   BAŞLAT
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
    loadTheme();
    loadFavorites();
    updateFavCount();
    loadPicks();
});
