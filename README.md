# Știri în neștire

Agregator de știri românești și internaționale, ca aplicație web instalabilă (PWA): titlurile din 41 de publicații într-o singură listă cronologică, fără cont, fără reclame. Articolele se citesc direct în aplicație, cu textul extras din pagina originală.

- **Aplicația:** https://tomitaro25.github.io/stiri-in-nestire/ (se instalează din browser; există și un APK pentru Android, împachetat ca TWA)
- **Versiunea curentă a interfeței:** v62 (`CACHE_NAME` din `app/sw.js`)

---

## Ce face

- Adună știrile din 41 de surse (RSS/Atom/RDF și câteva pagini HTML) și le afișează cronologic, cu poze unde sursa le oferă.
- **Citire în aplicație:** textul integral al articolului, justificat și despărțit corect în silabe pentru română; timp estimat de citire, „Articolul următor”, link spre original.
- **Categorii și surse:** Actualități, Vremea, Sport, Financiar, IT/Tech, Religie, Cultură, Internațional (grupat pe limbi). Se poate alege o categorie sau mai multe deodată și se poate restrânge la anumite surse.
- **Vremea:** categorie automată — titlurile despre vreme, prognoze și avertizări, din sursele românești de actualitate.
- **Ascunde știrile repetate:** aceeași știre publicată de mai multe surse apare o singură dată (din sursa preferată), cu celelalte variante sub titlu („Și la: …”). Gruparea compară cuvintele importante din titlu, doar în aceeași limbă, la cel mult 36 de ore distanță.
- **Căutare** în titluri, **Favorite**, **articole citite** estompate sau ascunse.
- **Citit fără internet:** salvează textul articolelor din selecția curentă (IndexedDB, 14 zile).
- **Aspect:** temă deschisă / întunecată / sepia / automată, 3 fonturi, 6 mărimi de text, 4 culori de text, aliniere.
- **Articole în alte limbi:** butoanele și mesajele din pagina articolului apar în limba sursei (FR, EN, DE); dacă textul nu poate fi afișat, aplicația spune de ce (site blocat, abonament, timeout).
- **Instalare și distribuire:** banner de instalare adaptat browserului (Android, iOS, browsere din aplicații), „Recomandă aplicația”, previzualizare Open Graph pentru linkuri.
- **Actualizare:** când apare o versiune nouă, aplicația afișează „O versiune nouă e disponibilă” cu butonul „Reîncarcă”.

## Cum arată

**Pe telefon:** o bară jos, cu iconițe și text — categoria curentă (deschide panoul de categorii și surse), Caută, Favorite, Setări. În articol, bara se schimbă în: Înapoi, Aa (mărimea textului), Distribuie, Favorit. Sus: titlul, ↻ (reîmprospătare) și ? (ajutor). La prima deschidere apar o carte de bun venit și indicația „Meniul aplicației e în bara de jos ↓”.

**Pe PC (fereastră de cel puțin 1100 px):** trei coloane — categoriile și sursele mereu la vedere în stânga, lista la mijloc, articolul deschis în dreapta. Taste rapide: `j` / `k` articolul următor / anterior, `/` caută, `f` favorit, `Esc` închide.

## Arhitectură

Două piese, găzduite separat:

```
 GitHub Pages                         Cloudflare Workers (plan gratuit)
 ┌──────────────────────┐             ┌─────────────────────────────────────┐
 │ app/index.html  (UI) │── GET / ──▶ │ worker.js                           │
 │ app/sw.js (offline)  │◀─ feed JSON─│  • GET /       → feed-ul din KV      │
 │ app/manifest.json    │─ ?article ─▶│  • ?article=   → textul articolului  │
 └──────────────────────┘── ?image ──▶│  • ?image=     → proxy de imagini    │
                                      │  • cron la 4 min → reconstruiește    │
                                      │    feed-ul și îl salvează în KV      │
                                      └─────────────────────────────────────┘
```

1. **Frontend** — un singur fișier `app/index.html` (HTML/CSS/JS fără framework și fără build), plus `sw.js` (service worker: interfața merge și offline) și `manifest.json`. Toate preferințele utilizatorului stau local (localStorage / IndexedDB).
2. **Backend** — `worker.js`, un Cloudflare Worker care:
   - la fiecare **4 minute** (Cron Trigger) citește toate sursele, câte 5 în paralel, le transformă într-un format comun (titlu, link, dată, sursă, imagine) și salvează feed-ul combinat în **Workers KV** (cheia `feed:v2`, cu `generatedAt` în metadata);
   - la deschiderea aplicației (`GET /`) trimite feed-ul exact cum e salvat în KV, fără să-l reconstruiască;
   - la `?article=<url>` descarcă pagina articolului și extrage textul cu `HTMLRewriter` (selectori per site), cu motivul eșecului când nu reușește;
   - la `?image=<url>` face proxy la imagini (ocolește protecțiile anti-hotlinking), doar pentru aplicație.

Aplicația nu vorbește niciodată direct cu site-urile sursă: totul trece prin Worker, care rezolvă CORS, extragerea textului și blocajele site-urilor.

## Surse active (41)

| Categorie | Surse |
|---|---|
| Actualități (RO) | Digi24, G4Media, HotNews, Adevărul, România Liberă, PressOne, Recorder, Biziday, Ziare.com, Republica, Factual.ro, Veridica, Context.ro, Buletin de București |
| Sport | GSP, Digi Sport |
| Financiar | Profit.ro, BURSA.RO, StartupCafe |
| IT/Tech | Go4it, XDA Developers, TechCrunch, Ars Technica |
| Religie | Basilica, Ziarul Lumina |
| Cultură | Scena9, Descoperă, Historia |
| Internațional | BBC World, The Guardian, Al Jazeera, Euronews (EN) · Le Figaro, France Info, 20 Minutes, Slate.fr, HuffPost France, Euronews FR · Der Spiegel · Deutsche Welle (RO) · The Conversation |

Regulă: orice sursă cu țară diferită de RO apare la Internațional (grupată pe limbi), cu excepția IT/Tech, unde subiectul contează mai mult decât țara.

Rezerve testate, dar neactivate (în `CANDIDATE_FEEDS`): Snoop, Public Record, Politico Europe, The Conversation FR, Economica.net, B365.
Scoase definitiv, pentru că blochează Worker-ul: Le Monde, France 24, TV5Monde, RFI (FR și RO).

## Limitele planului gratuit Cloudflare

Orice modificare la worker trebuie să rămână în aceste limite:

| Limită | Cum o respectăm |
|---|---|
| 50 de cereri externe / rulare | 41 de surse + cel mult 3 căutări de poze = **44** în cel mai rău caz. Nu se adaugă surse fără să se scoată altele. |
| 6 conexiuni simultane | `MAX_PARALLEL_FETCHES = 5` |
| KV: 1.000 scrieri / zi | o scriere la fiecare rulare de cron (~360 / zi) |
| KV: 100.000 citiri / zi | o citire la fiecare deschidere a aplicației |
| Cache API nu merge pe `*.workers.dev` | nu e folosit; totul trece prin KV |

Mecanisme care țin bugetul jos:
- **Surse citite mai rar:** Ziarul Lumina (la 30 min) și BURSA.RO (la 15 min) limitează cererile dese; între citiri se refolosesc articolele salvate.
- **Poze refolosite:** pozele găsite prin `og:image` (Digi24) se păstrează între rulări; căutările eșuate nu se repetă.
- **Limită de timp** de 10 s pe sursă (8 s pe articol), care acoperă și citirea răspunsului.
- **Surse care nu răspund:** articolele lor de la ultima rulare reușită rămân în listă (cel mult 7 zile), iar sursa apare „indisponibilă” în Setări.

## Diagnostic (direct din browser)

Toate se apelează pe adresa Worker-ului, ex. `https://stiri-proxy.tun-app.workers.dev/?debug_feed=1`.

| Adresă | Ce arată |
|---|---|
| `?debug_feed=1` | starea feed-ului din KV: vârsta, articole pe sursă, `failedSources`, motivul exact (`sourceIssues`), când au fost citite sursele rare |
| `?debug_source=<Nume>` | ce răspunde site-ul sursei (status, începutul răspunsului) |
| `?debug_parsed=<Nume>` | ce articole extrage worker-ul din feed |
| `?debug_extract=<Nume>[,<Nume>]` | ultimul articol al sursei: e blocat? câte paragrafe găsește fiecare selector? |
| `…&show=1` | în plus: paragrafele luate și cele lăsate pe dinafară, și în ce container HTML stă textul |
| `…&url=<adresa articolului>` | testează un articol anume, nu cel mai nou |
| `?debug_headers=<Nume>[&url=…]` | cere feed-ul (sau articolul) cu 5 „identități” diferite (browser, cititor RSS, aplicația declarată etc.) — arată care trece de firewall-ul site-ului |
| `?test_candidates=1` / `?test_candidate=<Nume>` | testează sursele-rezervă din `CANDIDATE_FEEDS` |

Diagnosticul nu atinge feed-ul și nu scrie în KV; consumă cereri doar când îl rulezi.

## Cum modific ceva

- **Adaug o sursă:** o pun întâi în `CANDIDATE_FEEDS` și o verific cu `?test_candidate=` și `?debug_extract=`. Dacă merge, o mut în `SOURCES` cu `genericFeedSource('Nume', 'url-feed', { country, category, lang })` și scot alta, ca să rămân sub 50 de cereri. Majoritatea site-urilor WordPress au feed la `/feed/`.
- **Un articol nu se extrage corect:** `?debug_extract=<Sursa>&show=1` arată containerul în care stă textul; adaug selectorul potrivit în `ARTICLE_EXTRACTORS` (ex. `'ziarullumina.ro': [['#article .text p']]`). Textele fixe care se strecoară (subsoluri, apeluri la donații) merg în `ARTICLE_JUNK`.
- **Un site răspunde cu 202/403 sau o pagină de verificare:** `?debug_headers=<Sursa>`. Dacă o identitate trece, o setez pe sursă (`headers: HEADER_VARIANTS.appBot`) și, pentru articole, în `ARTICLE_HEADERS`. Dacă niciuna nu trece, sursa e blocată după adresele Cloudflare și se scoate.
- **Un site răspunde cu 429 (prea multe cereri):** citesc sursa mai rar cu `throttled(sursa, minute)`.
- **Publicare:**
  - `worker.js` → deploy manual din dashboard-ul Cloudflare;
  - `app/` → push pe GitHub (Pages se actualizează singur);
  - la orice schimbare în `index.html` sau `sw.js` cresc numărul din `CACHE_NAME` (`app/sw.js`), altfel aplicațiile deja instalate nu văd schimbarea.

## Statistici de utilizare

Cloudflare Web Analytics (fără cookie-uri, fără identificarea vizitatorilor): o linie de cod la finalul `index.html`. Rapoartele sunt în dashboard-ul Cloudflare → Web Analytics → `tomitaro25.github.io`, filtrate după calea `/stiri-in-nestire/`. Utilizatorul nu vede nimic în aplicație; fără internet sau cu blocator de reclame, scriptul pur și simplu nu se încarcă.

## Limitări cunoscute

- **Site-uri care blochează citirea automată** (Le Monde, France 24, TV5Monde, RFI) — scoase din listă.
- **Articole doar pentru abonați** — aplicația afișează ce se poate extrage și avertizează că textul pare incomplet.
- **Republica** — nu are RSS; se citesc doar articolele vizibile pe prima pagină.
- **Historia** — nu are dată în listă; ora afișată (cu „≈”) e momentul în care worker-ul a văzut prima dată articolul.
- **Ziarul Lumina** — publică data ediției tipărite (adesea în viitor); se folosește tot ora „văzut prima dată”, marcată cu „≈”.
- **„Ascunde știrile repetate”** — grupează după cuvintele din titlu, doar în aceeași limbă; titlurile formulate foarte diferit pot rămâne separate.

## Stack

- Frontend: HTML/CSS/JS vanilla, un singur fișier, fără build și fără dependențe; service worker pentru offline; IndexedDB pentru articolele salvate.
- Backend: Cloudflare Workers (JavaScript, `HTMLRewriter`), Workers KV, Cron Trigger.
- Găzduire: GitHub Pages (interfața), Cloudflare (worker-ul și statisticile).
- Android: TWA generat cu PWABuilder; `assetlinks.json` servit din repo-ul `tomitaro25.github.io` (cu fișier `.nojekyll`).
