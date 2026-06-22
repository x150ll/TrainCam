/* مدرّب الحركة — Service Worker v2
   Cache-first strategy: يخزّن الملف الرئيسي + مكتبات MediaPipe
   عند أول تحميل، ثم يعمل offline بالكامل. */
const CACHE = "formcoach-v2";
const CORE = [
  "./",
  "./traincam.html",
  "https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/pose.js",
  "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.js"
];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c =>
      // addAll يفشل إذا أيّ طلب فشل، نستخدم Promise.allSettled بدلاً
      Promise.allSettled(CORE.map(url =>
        c.add(url).catch(() => {})
      ))
    )
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(ks =>
      Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(hit => {
      if (hit) return hit;                      // serve from cache
      return fetch(e.request).then(res => {
        // cache: same-origin + jsdelivr CDN + wasm/data assets
        try {
          const u = new URL(e.request.url);
          const ok = u.origin === self.location.origin
            || u.host.includes("jsdelivr.net")
            || /\.(wasm|data|tflite|binarypb)$/.test(u.pathname);
          if (ok && res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy).catch(() => {}));
          }
        } catch (_) {}
        return res;
      }).catch(() => caches.match("./traincam.html")); // fallback offline
    })
  );
});
