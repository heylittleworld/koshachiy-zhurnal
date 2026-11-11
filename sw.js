/* Кошачий журнал — работа без интернета.
   При обновлении приложения меняйте номер версии ниже. */
const V = "cj-v3";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./supabase.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(V)).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Сама страница: сначала сеть (чтобы получать обновления), без сети — из кэша
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req, { cache: "no-store" })
        .then((res) => {
          const copy = res.clone();
          caches.open(V).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Свои файлы: из кэша, иначе из сети
  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(req).then((r) => r || fetch(req)));
    return;
  }

  // Шрифты Google: кэшируем при первой загрузке
  if (url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com")) {
    e.respondWith(
      caches.open(V + "-fonts").then((c) =>
        c.match(req).then(
          (r) =>
            r ||
            fetch(req).then((res) => {
              c.put(req, res.clone());
              return res;
            })
        )
      )
    );
  }
});
