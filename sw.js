// Numele cache-ului include un numar de versiune - cand schimbam shell-ul aplicatiei
// (index.html, manifest, iconite), crestem numarul, ca telefoanele sa stie sa ia varianta noua.
const CACHE_NAME = 'stiri-in-nestire-v28';

// "Shell-ul" aplicatiei: fisierele care fac aplicatia sa arate si sa functioneze,
// spre deosebire de continutul (stirile), care vine mereu proaspat de la Worker.
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES))
  );
  // NU mai chemam self.skipWaiting() automat aici - vrem ca noul worker sa
  // ramana "in asteptare" pana cand utilizatorul confirma reincarcarea.
});

// Ascultam un mesaj explicit de la pagina ("acum, te rog preia controlul")
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', event => {
  // La activarea unei versiuni noi, stergem cache-urile vechi cu alt nume
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Cererile catre Worker-ul de stiri (alt domeniu) merg mereu direct la retea -
  // continutul trebuie sa fie proaspat, nu vrem stiri vechi servite din cache.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Fisierele shell-ului aplicatiei: incearca cache-ul intai (rapid, merge si offline),
  // si actualizeaza cache-ul din retea daca e disponibila.
  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
