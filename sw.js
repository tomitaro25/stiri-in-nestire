// Numele cache-ului include un numar de versiune - cand schimbam shell-ul aplicatiei
// (index.html, manifest, iconite), crestem numarul, ca telefoanele sa stie sa ia varianta noua.
const CACHE_NAME = 'stiri-in-nestire-v63';

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
    // cache: 'reload' = direct de pe server, nu din cache-ul HTTP al browserului (GitHub Pages
    // il tine 10 minute), altfel cache-ul versiunii noi se putea umple cu index.html-ul vechi.
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES.map(u => new Request(u, { cache: 'reload' }))))
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
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Cererile catre Worker-ul de stiri (alt domeniu) merg mereu direct la retea -
  // continutul trebuie sa fie proaspat, nu vrem stiri vechi servite din cache.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Deschiderea aplicatiei (navigare) inseamna mereu index.html, chiar daca linkul are
  // adaugiri ca ?fbclid=... (Facebook) sau ?utm_...: altfel, offline, nu se gasea in cache,
  // iar online fiecare varianta de link se salva separat si cache-ul crestea la nesfarsit.
  const isNavigation = request.mode === 'navigate';
  const cacheKey = isNavigation ? './index.html' : request;

  // Fisierele shell-ului aplicatiei: incearca cache-ul intai (rapid, merge si offline),
  // si actualizeaza cache-ul din retea daca e disponibila.
  let saved = Promise.resolve();
  const networkFetch = fetch(request).then(response => {
    if (response && response.ok && response.type === 'basic') {
      const copy = response.clone();
      saved = caches.open(CACHE_NAME).then(cache => cache.put(cacheKey, copy));
    }
    return response;
  });
  // service worker-ul ramane activ pana se termina si salvarea in cache
  event.waitUntil(networkFetch.then(() => saved, () => {}));
  event.respondWith(
    caches.match(cacheKey, { ignoreSearch: isNavigation }).then(cached =>
      cached || networkFetch.catch(() => (isNavigation
        ? caches.match('./index.html').then(r => r || Response.error())
        : Response.error()))
    )
  );
});
