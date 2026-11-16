// GUVIO — service worker simples
// - páginas: sempre tenta a rede primeiro (para pegar versão nova); sem internet, usa a última salva
// - arquivos do app (/_expo/, ícones): guarda no cache, porque o nome já muda a cada versão
const CACHE = "guvio-v1";
// fotos do Supabase: o nome de cada arquivo nunca se repete, então dá para guardar e não baixar de novo
const MEDIA = "guvio-media-v1";
const MEDIA_MAX = 400;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== MEDIA).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (
    url.hostname.endsWith(".supabase.co") &&
    url.pathname.includes("/storage/v1/object/public/") &&
    /\.(jpe?g|png|webp|gif|heic)$/i.test(url.pathname) &&
    !req.headers.has("range")
  ) {
    e.respondWith(
      caches.open(MEDIA).then(c =>
        c.match(req.url).then(
          hit =>
            hit ||
            // pede com CORS (o Supabase permite): resposta legível, que ocupa o tamanho real no cache
            fetch(req.url, { mode: "cors", credentials: "omit" })
              .then(res => {
                if (res.ok) c.put(req.url, res.clone()).then(() => trimMedia(c));
                return res;
              })
              .catch(() => fetch(req))
        )
      )
    );
    return;
  }
  if (url.origin !== self.location.origin) return; // Supabase (dados), vídeos etc. vão direto
  if (url.pathname.endsWith("/version.json")) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(new URL("./", self.registration.scope).href, copy));
          return res;
        })
        .catch(() => caches.match(new URL("./", self.registration.scope).href))
    );
    return;
  }

  if (url.pathname.includes("/_expo/") || url.pathname.includes("/assets/") || /\.(png|ico|webmanifest|ttf)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then(
        hit =>
          hit ||
          fetch(req).then(res => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then(c => c.put(req, copy));
            }
            return res;
          })
      )
    );
  }
});

function trimMedia(c) {
  return c.keys().then(keys => (keys.length > MEDIA_MAX ? Promise.all(keys.slice(0, keys.length - MEDIA_MAX).map(k => c.delete(k))) : null));
}

// ---------------------------------------------------------------------
// Avisos no celular (push): o servidor manda {title, body, url, tag}
// ---------------------------------------------------------------------
self.addEventListener("push", e => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch (err) {
    d = { title: "GUVIO", body: e.data ? e.data.text() : "" };
  }
  const scope = self.registration.scope;
  e.waitUntil(
    self.registration.showNotification(d.title || "GUVIO", {
      body: d.body || "",
      icon: scope + "icon-192.png",
      badge: scope + "icon-192.png",
      tag: d.tag || undefined,
      renotify: !!d.tag,
      data: { url: d.url || scope }
    })
  );
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.startsWith(self.registration.scope) && "focus" in c) {
          c.navigate(url).catch(() => {});
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
