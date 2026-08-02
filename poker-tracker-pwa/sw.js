// Service worker : permet à l'appli d'être "installée" et de s'ouvrir
// même en cas de connexion instable. Stratégie "réseau d'abord" :
// on essaie toujours d'avoir la dernière version en ligne, et on ne
// retombe sur la copie en cache que si le réseau échoue (vrai hors-ligne).

const CACHE_NAME = "poker-tracker-shell-v2";
const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192-v2.png",
  "./icon-512-v2.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // On ne touche qu'aux requêtes GET de notre propre site.
  // Firestore, Firebase Auth et les CDN externes passent directement
  // par le réseau, sans passer par le cache (données live obligatoires).
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin){
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match("./index.html")))
  );
});
