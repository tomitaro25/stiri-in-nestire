# Știri în neștire

O aplicație PWA de agregare a știrilor — titluri, rapid, fără reclame, fără zgomot.

Combină mai multe surse RSS românești și internaționale într-o singură listă cronologică, cu extragerea textului complet al articolelor (fără să te trimită pe site-ul original, plin de reclame și pop-up-uri), organizare pe categorii și căutare.

Aplicația e formată din două piese găzduite separat: interfața pe GitHub Pages (link-ul live apare în secțiunea „Settings → Pages" a acestui repo) și backend-ul pe Cloudflare Workers (adresa lui e setată în constanta `WORKER_URL` din `app/index.html`).

---

## Ce face

- Adună titluri din ~19 surse RSS/HTML într-o singură listă, sortată cronologic
- Extrage textul integral al articolelor, ca să citești direct în aplicație
- Organizare pe categorii (Actualități, Sport, Financiar, IT/Tech, Religie, Cultură, Internațional), cu selecție multiplă
- Căutare după cuvinte din titlu
- Poze mici la fiecare titlu, acolo unde sursa le oferă (trec printr-un proxy de imagini, ca să evite blocajele de tip anti-hotlinking ale unor site-uri)
- Pagină de Setări separată, navigabilă (nu un panou care se extinde): temă deschisă/închisă/automată, alegere de font (3 variante), mărime text reglabilă, nuanță text, selecție de surse
- Instalabilă ca aplicație (PWA) pe telefon/PC, funcționează și offline pentru interfață
- Butonul fizic „înapoi" al telefonului navighează în aplicație, nu iese din ea
- Butoane proprii de înainte/înapoi, fixate sus și jos, mereu vizibile

## Arhitectură

Două piese complet separate:

1. **Frontend** — un singur fișier `index.html` (HTML/CSS/JS vanilla, fără framework), găzduit static pe GitHub Pages. Conține și `sw.js` (service worker, pentru instalare PWA și cache-ul interfeței) și `manifest.json`.
2. **Backend** — `worker.js`, un Cloudflare Worker care:
   - aduce toate feed-urile RSS în paralel și le transformă într-un format comun (titlu, link, dată, sursă, categorie, țară, imagine)
   - la cerere (`?article=<url>`), extrage textul integral al unui articol de pe pagina originală, folosind `HTMLRewriter`
   - la cerere (`?image=<url>`), face proxy la imagini care blochează afișarea de pe alt domeniu (protecție anti-hotlinking)

Frontend-ul nu vorbește niciodată direct cu site-urile sursă — totul trece prin Worker, care rezolvă CORS, extragerea textului și problemele de protecție ale site-urilor.

## Surse active

| Sursă | Țară | Categorie |
|---|---|---|
| Digi24, G4Media, HotNews, Romania Liberă, PressOne, Recorder, Biziday, Republica | RO | Actualități |
| Ro Press Sport | RO | Sport |
| Ro Press Economic | RO | Financiar |
| Go4it | RO | IT/Tech |
| XDA Developers | US | IT/Tech (excepție: apare la IT, nu la Internațional) |
| Basilica (RO+EN), Ziarul Lumina | RO | Religie |
| Scena9 | RO | Cultură |
| BBC World | GB | Actualități (Internațional) |
| Der Spiegel | DE | Actualități (Internațional) |
| Le Monde, France Info, France 24 | FR | Actualități (Internațional) |

Regulă de organizare: sursele internaționale (țară ≠ RO) apar mereu sub categoria „Internațional", indiferent de subiectul lor — cu excepția IT/Tech, unde subiectul contează mai mult decât țara (de-asta XDA Developers apare acolo, nu la Internațional).

## Cum modific ceva

- **Adaug/scot o sursă** → editez `SOURCES` din `worker.js`. Majoritatea site-urilor WordPress au feed la `<url>/feed/`; caut `<link rel="alternate" type="application/rss+xml">` în codul sursă al site-ului dacă nu găsesc adresa din prima.
- **Un articol nu se extrage** → verific mai întâi cu `?article=<url>&debug=1` (îmi arată HTML-ul brut primit de Worker), apoi caut clasa CSS corectă în View Source al articolului și o adaug în `ARTICLE_EXTRACTORS`.
- **O sursă nouă nu aduce știri sau nu aduce poze** → verific cu `?debug_source=<Nume>` (XML/HTML brut) sau `?debug_parsed=<Nume>` (ce extrage funcția noastră) direct din browser.
- Orice modificare la `worker.js` necesită redeploy manual din dashboard-ul Cloudflare; orice modificare la `app/` necesită push pe GitHub (Pages se actualizează automat).
- La orice schimbare vizibilă în `index.html`/`sw.js`, cresc numărul de versiune din `CACHE_NAME` (în `sw.js`), altfel utilizatorii cu aplicația deja instalată nu văd schimbarea.

## Limitări cunoscute

- **Le Monde** — text integral neextractibil; site-ul servește o pagină „Client Challenge" (verificare JavaScript) către orice cerere care nu vine dintr-un browser real. Titlurile funcționează normal.
- **HotNews** — nu are imagine în feed, iar extragerea de rezervă (`og:image` de pe pagina articolului) nu a funcționat; rămâne fără poze.
- **Biziday** — majoritatea articolelor n-au poză (agregator de titluri scurte, nu are poze proprii decât ocazional).
- **Republica** — nu are RSS; citim direct HTML-ul paginii principale, ceea ce înseamnă că doar primele ~10 articole vizibile pe homepage sunt disponibile, nu o arhivă completă.

## Stack tehnic

- Frontend: HTML/CSS/JS vanilla, găzduit pe GitHub Pages
- Backend: Cloudflare Workers (JavaScript, `HTMLRewriter` pentru parsare HTML)
- Fără build step, fără dependințe externe
