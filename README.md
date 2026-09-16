# Frascarelli Trasporti — Website

Live site: [frascarellitrasporti.com](https://frascarellitrasporti.com)

🇬🇧 [English](#english) · 🇮🇹 [Italiano](#italiano) · 🇧🇷 [Português](#português)

---

## English

### About

Static marketing website for **Frascarelli Trasporti**, an Italian logistics company specializing in last-mile delivery, transport, loading/unloading and warehousing. The site is a single `index.html` page with **IT / PT-BR / EN / ES / ZH-CN / AR** language switching, a driver-recruitment section and an interactive map of indicative service areas.

### Tech stack

Plain HTML5, CSS3 and vanilla JavaScript — no build step, no framework, no package manager. [Leaflet](https://leafletjs.com/) and the web fonts are loaded from third-party CDNs; OpenStreetMap provides the map tiles.

### Project structure

```
├── index.html              Main (and only) page
├── css/
│   └── styles.css          All styling
├── js/
│   ├── script.js           i18n, nav, mobile menu, scroll-reveal animations
│   └── map-init.js         Leaflet map of the provinces served
├── assets/
│   ├── images/             Logo and other brand images
│   ├── photos/              Warehouse photography
│   ├── illustrations/       Illustrations used in content sections
│   ├── clients/              Client and partner logos
│   └── data/                 GeoJSON province boundaries for the map
├── documents/               Legacy reference files tracked in this public repository; review before publication
├── CNAME                   Custom domain for GitHub Pages
├── robots.txt / sitemap.xml SEO
└── site.webmanifest        PWA/icon manifest
```

### Key features

- **Multi-language content**: visible copy lives in `js/script.js` (`it`, `pt`, `en`, `es`, `zh`, `ar`); the active language is persisted in `localStorage` and reflected in the URL (`?lang=`). Arabic uses RTL layout.
- **Interactive coverage map**: `js/map-init.js` builds its selectable-area list from `assets/data/service-areas.json` and draws administrative boundaries from `assets/data/it-provinces.geojson`. Areas indicate station coverage or a company-designated territory and are not a promise of service in every municipality.
- **Dashboard access**: the external dashboard link only opens its normal login-protected site; this marketing website does not grant dashboard permissions.
- **Driver recruitment**: the “Lavora con noi / Careers” section opens an email draft; it does not submit data automatically.
- **Brand presentation**: the hero keeps the warehouse scene clean and the last-mile image uses a compact Frascarelli vehicle; client and partner marks retain their original brand colors.

### Updating the coverage map

Keep area IDs, display names and labels for all six languages in `assets/data/service-areas.json`. The map list and polygon selection are generated from this single file; no centroid markers are used. `geometryId` refers to an ISTAT province (`uts:<code>`) or region (`reg:<code>`), so Molise is intentionally represented as a region. Sulcis Iglesiente is explicitly company-designated (`source: company-designated`) and is not present in the current station-coverage registry. To refresh boundaries, download ISTAT's generalized 2026 WGS84 UTM32N shapefile ZIP and run:

```bash
python scripts/build-coverage-geojson.py path/to/Limiti01012026_g.zip --output /tmp/it-provinces.geojson
```

Review the resulting shapes and IDs before replacing `assets/data/it-provinces.geojson`. Source: [ISTAT administrative boundaries](https://www.istat.it/notizia/confini-delle-unita-amministrative-a-fini-statistici-al-1-gennaio-2018-2/). Include the administrative-boundary attribution when redistributing the map.
- **Scroll animations & sticky header**: implemented with `IntersectionObserver`, no external animation library.

### Running locally

No build tools required — just serve the folder statically, e.g.:

```bash
npx serve .
# or
python -m http.server 8000
```

Then open `http://localhost:8000`.

### Deployment

The site is deployed via **GitHub Pages** on the `main` branch, with a custom domain configured through the `CNAME` file (`frascarellitrasporti.com`). Pushing to `main` publishes the change directly — there is no CI/build pipeline.

---

## Italiano

### Descrizione

Sito web statico per **Frascarelli Trasporti**, azienda logistica italiana specializzata in consegne last mile, trasporto, carico/scarico e deposito merci. Il sito è una singola pagina (`index.html`) con contenuti in **IT / PT-BR / EN / ES / ZH-CN / AR**, sezione dedicata agli autisti e mappa interattiva delle aree operative indicative.

### Stack tecnologico

HTML5, CSS3 e JavaScript puro — nessun build step, nessun framework, nessun package manager. [Leaflet](https://leafletjs.com/) e i web font sono caricati da CDN esterne; OpenStreetMap fornisce le mappe di base.

### Struttura del progetto

```
├── index.html              Pagina principale (e unica)
├── css/
│   └── styles.css          Tutto lo stile
├── js/
│   ├── script.js           Cambio lingua, navigazione, menu mobile, animazioni scroll
│   └── map-init.js         Mappa Leaflet delle province servite
├── assets/
│   ├── images/             Logo e altre immagini del brand
│   ├── photos/              Fotografie del magazzino
│   ├── illustrations/       Illustrazioni usate nelle sezioni di contenuto
│   ├── clients/              Loghi di clienti e partner
│   └── data/                 Confini delle province (GeoJSON) per la mappa
├── documents/               File legacy versionati nel repository pubblico; da verificare prima della pubblicazione
├── CNAME                   Dominio personalizzato per GitHub Pages
├── robots.txt / sitemap.xml SEO
└── site.webmanifest        Manifest PWA/icone
```

### Funzionalità principali

- **Contenuti multilingua**: i testi visibili sono nel dizionario `js/script.js` (`it`, `pt`, `en`, `es`, `zh`, `ar`); l'arabo usa la direzione RTL.
- **Mappa interattiva**: elenco e aree selezionabili derivano da `assets/data/service-areas.json`; i confini sono in `assets/data/it-provinces.geojson`. Le aree indicano la copertura delle stazioni o un territorio indicato dall'azienda, senza garantire il servizio in ogni comune.
- **Accesso al dashboard**: il link apre il sito del dashboard, che continua a gestire autonomamente autenticazione e autorizzazioni.
- **Lavora con noi**: la sezione autisti apre una bozza di email, senza inviare dati automaticamente.
- **Animazioni allo scroll & header sticky**: realizzate con `IntersectionObserver`, senza librerie di animazione esterne.

### Esecuzione in locale

Non servono strumenti di build — basta servire la cartella staticamente, ad esempio:

```bash
npx serve .
# oppure
python -m http.server 8000
```

Poi aprire `http://localhost:8000`.

### Deploy

Il sito è pubblicato tramite **GitHub Pages** sul branch `main`, con dominio personalizzato configurato tramite il file `CNAME` (`frascarellitrasporti.com`). Ogni push su `main` pubblica direttamente le modifiche — non c'è nessuna pipeline CI/build.

---

## Português

### Sobre

Site institucional estático da **Frascarelli Trasporti**, empresa de logística italiana especializada em entregas de última milha, transporte, carga/descarga e armazenagem. O site é uma única página (`index.html`) com **IT / PT-BR / EN / ES / ZH-CN / AR**, seção para motoristas e mapa das áreas operacionais indicativas.

### Stack tecnológica

HTML5, CSS3 e JavaScript puro — sem etapa de build, sem framework, sem gerenciador de pacotes. O [Leaflet](https://leafletjs.com/) e as fontes web são carregados por CDNs externas; o OpenStreetMap fornece os mapas-base.

### Estrutura do projeto

```
├── index.html              Página principal (e única)
├── css/
│   └── styles.css          Toda a estilização
├── js/
│   ├── script.js           Troca de idioma, navegação, menu mobile, animações de rolagem
│   └── map-init.js         Mapa Leaflet das províncias atendidas
├── assets/
│   ├── images/             Logo e outras imagens da marca
│   ├── photos/              Fotos do armazém
│   ├── illustrations/       Ilustrações usadas nas seções de conteúdo
│   ├── clients/              Logos de clientes e parceiros
│   └── data/                 Limites das províncias (GeoJSON) para o mapa
├── documents/               Arquivos legados versionados no repositório público; revisar antes da publicação
├── CNAME                   Domínio customizado para o GitHub Pages
├── robots.txt / sitemap.xml SEO
└── site.webmanifest        Manifest PWA/ícones
```

### Principais funcionalidades

- **Conteúdo multilíngue**: os textos visíveis ficam no dicionário `js/script.js` (`it`, `pt`, `en`, `es`, `zh`, `ar`); o árabe usa RTL.
- **Mapa interativo**: a lista e as áreas selecionáveis vêm de `assets/data/service-areas.json`; os limites estão em `assets/data/it-provinces.geojson`. As áreas indicam a cobertura das estações ou territórios indicados pela empresa e não garantem atendimento em cada município.
- **Acesso ao dashboard**: o link abre o dashboard, que continua controlando a própria autenticação e permissões.
- **Imagens de marca**: o hero mantém a cena do armazém limpa; a seção last mile usa um furgão compacto genérico sem marca automotiva de terceiros.
- **Trabalhe conosco**: a seção de motoristas abre um rascunho de e-mail, sem enviar dados automaticamente.
- **Animações de rolagem e header fixo**: implementadas com `IntersectionObserver`, sem biblioteca externa de animação.

### Rodando localmente

Não é preciso nenhuma ferramenta de build — basta servir a pasta como arquivos estáticos, por exemplo:

```bash
npx serve .
# ou
python -m http.server 8000
```

Depois abra `http://localhost:8000`.

### Deploy

O site é publicado via **GitHub Pages** no branch `main`, com domínio customizado configurado pelo arquivo `CNAME` (`frascarellitrasporti.com`). Cada push para `main` publica a mudança diretamente — não há pipeline de CI/build.
