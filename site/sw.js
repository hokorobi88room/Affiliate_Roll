/* あなたの経理マン — オフラインでも計算できるように。
   方針: ネットワーク優先(常に最新を取りに行き、成功したらキャッシュ更新。
   オフライン時だけキャッシュから返す)。デプロイ後に古い画面が残らない。 */
const CACHE = "keiriman-v1";
const CORE = [
  "./", "index.html", "bonus.html", "kabe.html", "about.html", "privacy.html",
  "css/style.css", "js/calc.js", "js/ui.js", "js/guide.js",
  "data/rates2026.js", "data/affiliates.js", "manifest.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
