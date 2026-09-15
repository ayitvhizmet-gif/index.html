/* Service Worker - Network First Strategy */
const CACHE = "kupon-v2";
const STATIC_ASSETS = ["/", "/index.html", "/style.css", "/app.js", "/manifest.json"];

self.addEventListener("install", (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE).then((c) =>
            Promise.all(
                STATIC_ASSETS.map((url) =>
                    c.add(url).catch(() => null)
                )
            )
        )
    );
});

self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (e) => {
    const url = new URL(e.request.url);

    // Sadece GET istekleri
    if (e.request.method !== "GET") return;

    // API istekleri: her zaman network'ten, cache fallback YOK
    if (url.pathname.startsWith("/api/")) {
        e.respondWith(fetch(e.request));
        return;
    }

    // HTML/JS/CSS: Network first, cache fallback
    if (
        url.pathname === "/" ||
        url.pathname.endsWith(".html") ||
        url.pathname.endsWith(".js") ||
        url.pathname.endsWith(".css")
    ) {
        e.respondWith(
            fetch(e.request)
                .then((res) => {
                    if (res.ok) {
                        const copy = res.clone();
                        caches.open(CACHE).then((c) => c.put(e.request, copy));
                    }
                    return res;
                })
                .catch(() => caches.match(e.request))
        );
        return;
    }

    // Diğerleri (resim vs.): Cache first, network fallback
    e.respondWith(
        caches.match(e.request).then(
            (cached) =>
                cached ||
                fetch(e.request).then((res) => {
                    if (res.ok) {
                        const copy = res.clone();
                        caches.open(CACHE).then((c) => c.put(e.request, copy));
                    }
                    return res;
                })
        )
    );
});
