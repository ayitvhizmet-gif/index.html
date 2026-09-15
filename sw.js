const CACHE = "kupon-v1";
const ASSETS = ["/", "/index.html", "/style.css", "/app.js", "/manifest.json"];

self.addEventListener("install", e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
    self.skipWaiting();
});

self.addEventListener("activate", e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", e => {
    const url = new URL(e.request.url);

    // API istekleri: her zaman ağdan
    if (url.pathname.startsWith("/api/")) {
        e.respondWith(
            fetch(e.request).catch(() =>
                new Response(JSON.stringify({ success: false, picks: [] }), {
                    headers: { "Content-Type": "application/json" }
                })
            )
        );
        return;
    }

    // Diğerleri: önce cache, sonra ağ
    e.respondWith(
        caches.match(e.request).then(res => res || fetch(e.request).then(netRes => {
            if (netRes.ok && e.request.method === "GET") {
                const copy = netRes.clone();
                caches.open(CACHE).then(c => c.put(e.request, copy));
            }
            return netRes;
        }).catch(() => caches.match("/index.html")))
    );
});
