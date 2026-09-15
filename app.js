/* =====================================================
   MAÇ KUPONLARI - APP.JS (Full Featured - No SW)
===================================================== */

"use strict";

/* ========== ÇEVİRİLER ========== */
const I18N = {
    tr: {
        title: "MAÇ KUPONLARI", subtitle: "ÜCRETSİZ MAÇ TAHMİNLERİ",
        refresh: "YENİLE", heroBadge: "🔥 GÜNÜN TAHMİNLERİ",
        heroTitle: "Günün Ücretsiz", heroTitleSpan: "Maç Kuponları",
        heroDesc: "Güncel maç tahminlerini, oranları ve güven yüzdelerini tek yerde görüntüle.",
        date: "TARİH", status: "DURUM", prediction: "TAHMİN",
        loadingData: "Veriler yükleniyor...", current: "Güncel", error: "Hata",
        filterAll: "🏆 TÜMÜ", filterBanko: "🔥 BANKO", filterHigh: "⭐ %75+",
        filterToday: "📅 BUGÜN", filterFav: "❤️ FAVORİLER",
        leagueAll: "Tüm Ligler", timeAll: "Tüm Saatler",
        timeMorning: "Sabah (00-12)", timeAfternoon: "Öğleden Sonra (12-18)", timeEvening: "Akşam (18-24)",
        sortDefault: "Sıralama: Varsayılan", sortConfHigh: "Güven ↓", sortConfLow: "Güven ↑",
        sortOddsHigh: "Oran ↓", sortOddsLow: "Oran ↑", sortTime: "Saat (Erken→Geç)",
        searchPlaceholder: "Takım veya lig ara...",
        sectionTitle: "Günün Kuponları",
        noResult: "Tahmin bulunamadı", noResultDesc: "Arama veya filtre kriterlerini değiştirin.",
        info: "Bilgilendirme",
        infoDesc: "Bu sayfa yalnızca maç tahminlerini bilgilendirme amacıyla gösterir. Tahminler kesin sonuç veya kazanç garantisi değildir.",
        footerDesc: "Günlük ücretsiz maç tahminleri", footerCopy: "© 2026 Maç Kuponları",
        statsTitle: "📊 Günün İstatistikleri",
        statTotal: "Toplam Maç", statBanko: "Banko", statHigh: "Yüksek Güven",
        statAvgConf: "Ort. Güven", statAvgOdds: "Ort. Oran",
        chartTitle: "📈 Güven Dağılımı",
        countdownLabel: "⏱️ KALAN SÜRE", started: "🔴 Başladı",
        detail: "Maç Detayı", share: "Paylaş", close: "Kapat",
        copied: "Bağlantı kopyalandı!",
        noShare: "Paylaşım desteklenmiyor.",
        lastUpdate: "Son güncelleme",
        favAdd: "☆ Favorilere Ekle", favRemove: "★ Favorilerden Çıkar",
        loading: "Kuponlar hazırlanıyor..."
    },
    en: {
        title: "MATCH COUPONS", subtitle: "FREE MATCH PREDICTIONS",
        refresh: "REFRESH", heroBadge: "🔥 TODAY'S PICKS",
        heroTitle: "Today's Free", heroTitleSpan: "Match Coupons",
        heroDesc: "View today's match predictions, odds and confidence ratings in one place.",
        date: "DATE", status: "STATUS", prediction: "PREDICTION",
        loadingData: "Loading data...", current: "Current", error: "Error",
        filterAll: "🏆 ALL", filterBanko: "🔥 BANKER", filterHigh: "⭐ 75%+",
        filterToday: "📅 TODAY", filterFav: "❤️ FAVORITES",
        leagueAll: "All Leagues", timeAll: "All Times",
        timeMorning: "Morning (00-12)", timeAfternoon: "Afternoon (12-18)", timeEvening: "Evening (18-24)",
        sortDefault: "Sort: Default", sortConfHigh: "Confidence ↓", sortConfLow: "Confidence ↑",
        sortOddsHigh: "Odds ↓", sortOddsLow: "Odds ↑", sortTime: "Time (Early→Late)",
        searchPlaceholder: "Search team or league...",
        sectionTitle: "Today's Coupons",
        noResult: "No prediction found", noResultDesc: "Change search or filter criteria.",
        info: "Information",
        infoDesc: "This page only displays match predictions for informational purposes. Not a guarantee.",
        footerDesc: "Daily free match predictions", footerCopy: "© 2026 Match Coupons",
        statsTitle: "📊 Today's Statistics",
        statTotal: "Total Matches", statBanko: "Banker", statHigh: "High Confidence",
        statAvgConf: "Avg. Confidence", statAvgOdds: "Avg. Odds",
        chartTitle: "📈 Confidence Distribution",
        countdownLabel: "⏱️ TIME LEFT", started: "🔴 Started",
        detail: "Match Detail", share: "Share", close: "Close",
        copied: "Link copied!",
        noShare: "Sharing not supported.",
        lastUpdate: "Last update",
        favAdd: "☆ Add to Favorites", favRemove: "★ Remove from Favorites",
        loading: "Coupons are loading..."
    }
};

/* ========== DURUM ========== */
let allPicks = [], filteredPicks = [];
let activeFilter = "all", searchText = "";
let leagueFilter = "all", timeFilter = "all", sortMode = "default";
let favorites = new Set(), countdownTimer = null;
let currentLang = "tr";

const FAV_KEY = "coupon_favorites";
const THEME_KEY = "coupon_theme";
const LANG_KEY = "coupon_lang";

/* ========== ELEMENTLER ========== */
const $ = id => document.getElementById(id);
const couponContainer = $("couponContainer");
const noResults = $("noResults");
const resultCount = $("resultCount");
const searchInput = $("searchInput");
const filterButtons = document.querySelectorAll(".filter-button");
const refreshButton = $("refreshButton");
const themeToggle = $("themeToggle");
const langToggle = $("langToggle");
const todayDate = $("todayDate");
const dataStatus = $("dataStatus");
const matchCount = $("matchCount");
const statusIndicator = $("statusIndicator");
const statusMessage = $("statusMessage");
const lastUpdate = $("lastUpdate");
const favCount = $("favCount");
const statTotal = $("statTotal");
const statBanko = $("statBanko");
const statHigh = $("statHigh");
const statAvgConf = $("statAvgConf");
const statAvgOdds = $("statAvgOdds");
const chartBars = $("chartBars");
const leagueSelect = $("leagueSelect");
const timeSelect = $("timeSelect");
const sortSelect = $("sortSelect");
const detailModal = $("detailModal");
const modalBody = $("modalBody");

/* ========== TEMA ========== */
function loadTheme() {
    let t = "dark";
    try { t = localStorage.getItem(THEME_KEY) || "dark"; } catch (e) {}
    document.documentElement.dataset.theme = t;
    updateThemeIcon(t);
}
function setTheme(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
    updateThemeIcon(t);
}
function updateThemeIcon(t) {
    const i = document.querySelector(".theme-icon");
    if (i) i.textContent = t === "light" ? "☀️" : "🌙";
}
function toggleTheme() {
    setTheme((document.documentElement.dataset.theme || "dark") === "dark" ? "light" : "dark");
}

/* ========== DİL ========== */
function loadLang() {
    let l = "tr";
    try { l = localStorage.getItem(LANG_KEY) || "tr"; } catch (e) {}
    setLang(l);
}
function setLang(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    const lbl = document.querySelector(".lang-label");
    if (lbl) lbl.textContent = lang.toUpperCase();
    applyTranslations();
    render();
    renderStats();
    renderChart();
}
function toggleLang() { setLang(currentLang === "tr" ? "en" : "tr"); }
function t(key) { return (I18N[currentLang] && I18N[currentLang][key]) || key; }

function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
        el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
        el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll("#leagueSelect option[data-i18n]").forEach(el => {
        el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll("#timeSelect option[data-i18n]").forEach(el => {
        el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll("#sortSelect option[data-i18n]").forEach(el => {
        el.textContent = t(el.dataset.i18n);
    });
}

/* ========== FAVORİLER ========== */
function loadFavorites() {
    try {
        const raw = localStorage.getItem(FAV_KEY);
        if (raw) favorites = new Set(JSON.parse(raw));
    } catch (e) { favorites = new Set(); }
}
function saveFavorites() {
    try { localStorage.setItem(FAV_KEY, JSON.stringify([...favorites])); } catch (e) {}
}
function toggleFavorite(id) {
    if (!id) return;
    if (favorites.has(id)) favorites.delete(id);
    else favorites.add(id);
    saveFavorites();
    updateFavCount();
    applyFilters();
}
function updateFavCount() {
    if (favCount) favCount.textContent = favorites.size > 0 ? favorites.size : "";
}

/* ========== YARDIMCI ========== */
function normalize(s) {
    return String(s || "").toLowerCase()
        .replace(/ı/g,"i").replace(/İ/g,"i").replace(/ş/g,"s").replace(/ğ/g,"g")
        .replace(/ü/g,"u").replace(/ö/g,"o").replace(/ç/g,"c").trim();
}
function escapeHtml(s) {
    return String(s == null ? "" : s)
        .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}
function getConfidence(p) {
    const r = Number(p.prob || p.confidence || p.guven || 0);
    if (!r) return 0;
    if (r <= 5) return r * 20;
    if (r <= 10) return r * 10;
    return r;
}
function getOddsNum(p) {
    const o = String(p.odds || p.oran || "0").replace(",", ".");
    return parseFloat(o) || 0;
}
function getPickId(p) {
    return p.id || `${p.home}-${p.away}-${p.time}`;
}
function isBanko(p) {
    return p.isHero === true || getConfidence(p) >= 85;
}
function statusInfo(s) {
    const n = normalize(s);
    if (n === "won" || n === "kazandi" || n === "1") return { text: "KAZANDI", cls: "won" };
    if (n === "lost" || n === "kaybetti" || n === "0") return { text: "KAYBETTİ", cls: "lost" };
    if (n === "void" || n === "iptal") return { text: "İPTAL", cls: "void" };
    return { text: "DEVAM EDİYOR", cls: "pending" };
}
function confidenceStars(v) {
    let n = Number(v) || 0;
    if (n > 10) n = Math.round(n / 20);
    else if (n > 5) n = Math.round(n / 2);
    n = Math.max(1, Math.min(5, n));
    return "★".repeat(n) + "☆".repeat(5 - n);
}
function cardConfClass(p) {
    const c = getConfidence(p);
    if (isBanko(p) || c >= 85) return "conf-banko";
    if (c >= 75) return "conf-high";
    if (c >= 60) return "conf-mid";
    return "conf-low";
}
function formatToday() {
    const aylar = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
    const d = new Date();
    return `${d.getDate()} ${aylar[d.getMonth()]} ${d.getFullYear()}`;
}

/* ========== GERİ SAYIM ========== */
function getCountdown(kickoff) {
    if (!kickoff) return "";
    const tm = new Date(kickoff).getTime();
    if (isNaN(tm)) return "";
    const diff = tm - Date.now();
    if (diff <= 0) return t("started");
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

/* ========== TOAST ========== */
let toastEl = null;
function showToast(msg) {
    if (!toastEl) {
        toastEl = document.createElement("div");
        toastEl.className = "toast";
        document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

/* ========== PAYLAŞ ========== */
async function sharePick(p) {
    const url = window.location.origin + (p.slug ? `/tr/match/${p.slug}` : "");
    const text = `⚽ ${p.home} - ${p.away}\n🎯 ${t("prediction")}: ${p.tip || p.pick || ""}\n📊 Oran: ${p.odds || ""}\n🏆 Güven: %${getConfidence(p)}`;
    if (navigator.share) {
        try { await navigator.share({ title: "Maç Kuponu", text, url }); } catch (e) {}
    } else {
        try {
            await navigator.clipboard.writeText(`${text}\n${url}`);
            showToast(t("copied"));
        } catch (e) { showToast(t("noShare")); }
    }
}

/* ========== KART ========== */
function createCard(p) {
    const card = document.createElement("article");
    const id = getPickId(p);
    const isFav = favorites.has(id);
    const status = statusInfo(p.status);
    const stars = confidenceStars(getConfidence(p));
    const oran = p.odds || p.oran || "-";
    const tahmin = p.tip || p.pick || p.prediction || p.tahmin || "";
    const lig = p.league || p.lig || "";
    const ev = p.home || p.evSahibi || "";
    const dep = p.away || p.deplasman || "";
    const homeLogo = p.homeLogo || "";
    const awayLogo = p.awayLogo || "";
    const kickoff = p.kickoff || "";
    const macSaati = p.time || p.date || "";
    const analiz = p.analysis || p.analiz || "";
    const conf = getConfidence(p);

    card.className = `coupon-card ${cardConfClass(p)}`;

    const bankoBadge = isBanko(p) ? `<span class="banko-badge">BANKO</span>` : "";
    const homeLogoHtml = homeLogo ? `<img src="${escapeHtml(homeLogo)}" class="team-logo" alt="" loading="lazy" onerror="this.style.display='none'">` : "";
    const awayLogoHtml = awayLogo ? `<img src="${escapeHtml(awayLogo)}" class="team-logo" alt="" loading="lazy" onerror="this.style.display='none'">` : "";
    const countdownHtml = kickoff ? `
        <div class="countdown-box">
            <span class="countdown-label">${t("countdownLabel")}</span>
            <span class="countdown" data-kickoff="${escapeHtml(kickoff)}">${getCountdown(kickoff)}</span>
        </div>` : "";

    card.innerHTML = `
        <div class="card-actions">
            <button class="card-action-btn fav-btn ${isFav ? "active" : ""}" type="button" title="Favori">
                ${isFav ? "★" : "☆"}
            </button>
            <button class="card-action-btn share-btn" type="button" title="${t("share")}">
                📤
            </button>
        </div>

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
                <span class="info-label">${t("prediction")}</span>
                <span class="info-value">${escapeHtml(tahmin)}</span>
            </div>
            <div class="info-box">
                <span class="info-label">ORAN</span>
                <span class="info-value odds">${escapeHtml(String(oran))}</span>
            </div>
        </div>

        ${countdownHtml}
        ${analiz ? `<p class="analysis">${escapeHtml(analiz)}</p>` : ""}

        <div class="card-bottom">
            <span class="date">${escapeHtml(macSaati)}</span>
            <span class="stars" title="%${conf}">${stars}</span>
        </div>
    `;

    card.querySelector(".fav-btn").addEventListener("click", e => {
        e.stopPropagation();
        toggleFavorite(id);
    });
    card.querySelector(".share-btn").addEventListener("click", e => {
        e.stopPropagation();
        sharePick(p);
    });
    card.addEventListener("click", () => openDetail(p));

    return card;
}

/* ========== MODAL ========== */
function openDetail(p) {
    const conf = getConfidence(p);
    const homeLogo = p.homeLogo ? `<img src="${escapeHtml(p.homeLogo)}" class="modal-team-logo" onerror="this.style.display='none'">` : "";
    const awayLogo = p.awayLogo ? `<img src="${escapeHtml(p.awayLogo)}" class="modal-team-logo" onerror="this.style.display='none'">` : "";
    const id = getPickId(p);
    const isFav = favorites.has(id);

    modalBody.innerHTML = `
        <div class="modal-league">${escapeHtml(p.league || "")}</div>
        <div class="modal-teams">
            <div class="modal-team">
                ${homeLogo}
                <span class="modal-team-name">${escapeHtml(p.home || "")}</span>
            </div>
            <span class="modal-vs">-</span>
            <div class="modal-team">
                ${awayLogo}
                <span class="modal-team-name">${escapeHtml(p.away || "")}</span>
            </div>
        </div>
        <div class="modal-info-grid">
            <div class="modal-info-box">
                <div class="modal-info-label">${t("prediction")}</div>
                <div class="modal-info-value">${escapeHtml(p.tip || p.pick || "")}</div>
            </div>
            <div class="modal-info-box">
                <div class="modal-info-label">ORAN</div>
                <div class="modal-info-value odds">${escapeHtml(String(p.odds || ""))}</div>
            </div>
            <div class="modal-info-box">
                <div class="modal-info-label">GÜVEN</div>
                <div class="modal-info-value conf">%${conf}</div>
            </div>
        </div>
        ${p.analysis ? `<div class="modal-analysis">${escapeHtml(p.analysis)}</div>` : ""}
        <div class="modal-actions">
            <button class="modal-action-btn" id="modalFavBtn">
                ${isFav ? t("favRemove") : t("favAdd")}
            </button>
            <button class="modal-action-btn" id="modalShareBtn">
                📤 ${t("share")}
            </button>
        </div>
    `;

    $("modalFavBtn").addEventListener("click", () => {
        toggleFavorite(id);
        openDetail(p);
    });
    $("modalShareBtn").addEventListener("click", () => sharePick(p));

    detailModal.classList.add("open");
    document.body.style.overflow = "hidden";
}

function closeDetail() {
    detailModal.classList.remove("open");
    document.body.style.overflow = "";
}

/* ========== FİLTRELEME ========== */
function applyFilters() {
    const q = normalize(searchText);
    filteredPicks = allPicks.filter(p => {
        const id = getPickId(p);

        if (activeFilter === "banko" && !isBanko(p)) return false;
        if (activeFilter === "high" && getConfidence(p) < 75) return false;
        if (activeFilter === "today" && p.today === false) return false;
        if (activeFilter === "favorites" && !favorites.has(id)) return false;

        if (leagueFilter !== "all" && normalize(p.league) !== normalize(leagueFilter)) return false;

        if (timeFilter !== "all") {
            const h = parseInt(String(p.time || "").split(":")[0], 10);
            if (isNaN(h)) return false;
            if (timeFilter === "morning" && h >= 12) return false;
            if (timeFilter === "afternoon" && (h < 12 || h >= 18)) return false;
            if (timeFilter === "evening" && h < 18) return false;
        }

        if (q) {
            const havuz = normalize([
                p.league, p.lig, p.home, p.away,
                p.tip, p.pick, p.prediction, p.tahmin,
                p.analysis, p.analiz
            ].join(" "));
            if (!havuz.includes(q)) return false;
        }
        return true;
    });

    if (sortMode === "confHigh") filteredPicks.sort((a, b) => getConfidence(b) - getConfidence(a));
    else if (sortMode === "confLow") filteredPicks.sort((a, b) => getConfidence(a) - getConfidence(b));
    else if (sortMode === "oddsHigh") filteredPicks.sort((a, b) => getOddsNum(b) - getOddsNum(a));
    else if (sortMode === "oddsLow") filteredPicks.sort((a, b) => getOddsNum(a) - getOddsNum(b));
    else if (sortMode === "time") filteredPicks.sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")));

    render();
}

/* ========== EKRANA ÇİZİM ========== */
function render() {
    if (!couponContainer) return;
    couponContainer.innerHTML = "";

    if (resultCount) resultCount.textContent = `${filteredPicks.length} MAÇ`;
    if (matchCount) matchCount.textContent = String(filteredPicks.length);

    if (filteredPicks.length === 0) {
        if (noResults) noResults.style.display = "block";
        return;
    }
    if (noResults) noResults.style.display = "none";

    const frag = document.createDocumentFragment();
    filteredPicks.forEach(p => frag.appendChild(createCard(p)));
    couponContainer.appendChild(frag);
    startCountdownTimer();
}

/* ========== İSTATİSTİK ========== */
function renderStats() {
    const src = filteredPicks.length > 0 ? filteredPicks : allPicks;
    if (!src.length) {
        if (statTotal) statTotal.textContent = "0";
        if (statBanko) statBanko.textContent = "0";
        if (statHigh) statHigh.textContent = "0";
        if (statAvgConf) statAvgConf.textContent = "%0";
        if (statAvgOdds) statAvgOdds.textContent = "0.00";
        return;
    }
    const total = src.length;
    const banko = src.filter(isBanko).length;
    const high = src.filter(p => getConfidence(p) >= 75).length;
    const avgConf = Math.round(src.reduce((s, p) => s + getConfidence(p), 0) / total);
    const avgOddsArr = src.map(getOddsNum).filter(n => n > 0);
    const avgOdds = avgOddsArr.length ? (avgOddsArr.reduce((a, b) => a + b, 0) / avgOddsArr.length).toFixed(2) : "0.00";

    if (statTotal) statTotal.textContent = total;
    if (statBanko) statBanko.textContent = banko;
    if (statHigh) statHigh.textContent = high;
    if (statAvgConf) statAvgConf.textContent = `%${avgConf}`;
    if (statAvgOdds) statAvgOdds.textContent = avgOdds;
}

/* ========== GRAFİK ========== */
function renderChart() {
    if (!chartBars) return;
    const src = allPicks;
    if (!src.length) { chartBars.innerHTML = ""; return; }

    const buckets = [
        { label: "0-50",  min: 0,  max: 50,  count: 0 },
        { label: "50-70", min: 50, max: 70,  count: 0 },
        { label: "70-80", min: 70, max: 80,  count: 0 },
        { label: "80-90", min: 80, max: 90,  count: 0 },
        { label: "90-100",min: 90, max: 101, count: 0 }
    ];
    src.forEach(p => {
        const c = getConfidence(p);
        for (const b of buckets) {
            if (c >= b.min && c < b.max) { b.count++; break; }
        }
    });
    const maxCount = Math.max(...buckets.map(b => b.count), 1);

    chartBars.innerHTML = buckets.map(b => {
        const height = Math.round((b.count / maxCount) * 100);
        return `
            <div class="chart-bar-wrap">
                <div class="chart-bar-value">${b.count}</div>
                <div class="chart-bar" style="height:${height}%"></div>
                <div class="chart-bar-label">${b.label}%</div>
            </div>
        `;
    }).join("");
}

/* ========== LİG DROPDOWN ========== */
function populateLeagues() {
    if (!leagueSelect) return;
    const leagues = [...new Set(allPicks.map(p => p.league).filter(Boolean))].sort();
    const current = leagueSelect.value;
    leagueSelect.innerHTML = `<option value="all">${t("leagueAll")}</option>` +
        leagues.map(l => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join("");
    if (leagues.includes(current)) leagueSelect.value = current;
}

/* ========== DURUM ========== */
function setStatus(type, msg) {
    if (statusIndicator) statusIndicator.className = "status-indicator " + type;
    if (statusMessage) statusMessage.textContent = msg;
    if (dataStatus) {
        dataStatus.textContent = type === "success" ? t("current")
            : type === "error" ? t("error") : "...";
    }
}
function setLastUpdate() {
    if (!lastUpdate) return;
    const d = new Date();
    const sa = String(d.getHours()).padStart(2, "0");
    const dk = String(d.getMinutes()).padStart(2, "0");
    lastUpdate.textContent = `${t("lastUpdate")}: ${sa}:${dk}`;
}

/* ========== VERİ YÜKLE ========== */
async function loadPicks() {
    setStatus("loading", t("loadingData"));
    if (couponContainer) couponContainer.innerHTML = `
        <div class="loading-card">
            <div class="loading-spinner">⚽</div>
            <h3>${t("loading")}</h3>
        </div>`;

    try {
        const res = await fetch("/api/picks", { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        if (data && data.success === false) throw new Error(data.error || "API error");

        allPicks = Array.isArray(data) ? data : (data.picks || []);
        populateLeagues();
        applyFilters();
        renderStats();
        renderChart();
        updateFavCount();

        setStatus("success", `${allPicks.length} maç yüklendi`);
        setLastUpdate();
    } catch (err) {
        console.error("Veri yükleme hatası:", err);
        allPicks = [];
        filteredPicks = [];
        render();
        renderStats();
        setStatus("error", t("error"));
        if (noResults) {
            noResults.style.display = "block";
            noResults.innerHTML = `
                <div class="no-results-icon">⚠️</div>
                <h3>${t("error")}</h3>
                <p>API bağlantı hatası</p>`;
        }
    }
}

/* ========== OLAYLAR ========== */
function bindEvents() {
    if (todayDate) todayDate.textContent = formatToday();
    if (themeToggle) themeToggle.addEventListener("click", toggleTheme);
    if (langToggle) langToggle.addEventListener("click", toggleLang);

    if (searchInput) {
        searchInput.addEventListener("input", e => {
            searchText = e.target.value;
            applyFilters();
            renderStats();
        });
    }
    filterButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            filterButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeFilter = normalize(btn.dataset.filter || "all");
            applyFilters();
            renderStats();
        });
    });
    if (leagueSelect) leagueSelect.addEventListener("change", e => {
        leagueFilter = e.target.value;
        applyFilters();
        renderStats();
    });
    if (timeSelect) timeSelect.addEventListener("change", e => {
        timeFilter = e.target.value;
        applyFilters();
        renderStats();
    });
    if (sortSelect) sortSelect.addEventListener("change", e => {
        sortMode = e.target.value;
        applyFilters();
    });
    if (refreshButton) {
        refreshButton.addEventListener("click", () => {
            refreshButton.disabled = true;
            loadPicks().finally(() => { refreshButton.disabled = false; });
        });
    }
    document.querySelectorAll("[data-close-modal]").forEach(el => {
        el.addEventListener("click", closeDetail);
    });
    document.addEventListener("keydown", e => {
        if (e.key === "Escape") closeDetail();
    });
}

/* ========== BAŞLAT ========== */
document.addEventListener("DOMContentLoaded", () => {
    loadTheme();
    loadFavorites();
    loadLang();
    updateFavCount();
    bindEvents();
    loadPicks();
    // registerSW();  ← Service Worker devre dışı
});
