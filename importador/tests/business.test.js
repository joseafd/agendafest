process.env.NODE_ENV = 'test';
const assert = require('assert');
const http = require('http');
const { scrapeFestival } = require('../scraper');
const {
  extractLineupWithAi, getModelCandidates, DEFAULT_GEMINI_MODEL,
  ENRICHMENT_GEMINI_MODEL, parseRetryDelayMs, getArtistBatchSize,
  getRetryWaitMs, FREE_TIER_MIN_INTERVAL_MS
} = require('../gemini');
const { searchSpotifyArtist } = require('../spotify');

// Start a mock target server on port 3032
const targetServer = http.createServer((req, res) => {
  if (req.url === '/festival-simple') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Mock Resurrection Fest 2026</title>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "MusicEvent",
              "name": "Resurrection Fest 2026",
              "startDate": "2026-07-17"
            }
          </script>
        </head>
        <body>
          <h1>Resurrection Fest 2026</h1>
          <table>
            <tr><th>Banda</th><th>Escenario</th><th>Hora</th></tr>
            <tr><td>Annisokay</td><td>Main Stage</td><td>19:00 - 20:00</td></tr>
            <tr><td>Gojira</td><td>Main Stage</td><td>22:00 - 23:30</td></tr>
          </table>
          <a href="/the-timetable">The timetable is here!</a>
          <a href="/horarios.pdf">Descargar PDF de Horarios</a>
          <img src="/logo.png" />
        </body>
      </html>
    `);
  } else if (req.url === '/the-timetable') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<html><head><title>Timetable</title></head><body><img src="/day-1.jpg" alt="Day 1 timetable"></body></html>');
  } else if (req.url === '/day-1.jpg') {
    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
    res.end(Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
  } else if (req.url === '/horarios.pdf') {
    // Return empty mock file as PDF (since pdf-parse will fail, it handles gracefully or we can mock it)
    res.writeHead(200, { 'Content-Type': 'application/pdf' });
    res.end('%PDF-1.4 mock pdf contents');
  } else {
    res.writeHead(404);
    res.end();
  }
});

targetServer.listen(3032, '127.0.0.1');

async function runBusinessTests() {
  console.log('=== INICIANDO PRUEBAS DE NEGOCIO (INCREMENTO 2) ===\n');
  let testCount = 0;
  let passedCount = 0;

  async function runTestAsync(name, fn) {
    testCount++;
    try {
      await fn();
      console.log(`🟢 TEST ${testCount} PASADO: ${name}`);
      passedCount++;
    } catch (e) {
      console.error(`🔴 TEST ${testCount} FALLADO: ${name}`);
      console.error(e);
    }
  }

  // TEST 1: Scraper descubre tablas y clasifica recursos
  await runTestAsync('El Scraper descubre tablas HTML, JSON-LD y recursos asociados', async () => {
    const data = await scrapeFestival('http://127.0.0.1:3032/festival-simple');
    
    assert.strictEqual(data.url, 'http://127.0.0.1:3032/festival-simple');
    assert.ok(data.htmlContent.includes('Resurrection Fest 2026'));
    
    // Check JSON-LD
    assert.strictEqual(data.jsonLd.length, 1);
    assert.strictEqual(data.jsonLd[0].name, 'Resurrection Fest 2026');
    
    // Check Tables Text
    assert.ok(data.tablesText.includes('Annisokay'));
    assert.ok(data.tablesText.includes('Gojira'));
    
    // Check images
    assert.ok(data.images.some(img => img.url.includes('logo.png')));
    assert.ok(data.pages.some(page => page.url.includes('/the-timetable')));
    const timetableImage = data.images.find(img => img.url.includes('/day-1.jpg'));
    assert.ok(timetableImage && timetableImage.data && timetableImage.mimeType === 'image/jpeg');
  });

  // TEST 2: Extractor Gemini en modo Mock
  await runTestAsync('Gemini AI en modo Mock estructura correctamente la programación', async () => {
    const scrapedData = {
      url: 'http://127.0.0.1:3032/festival-simple',
      tablesText: 'Annisokay en Main Stage el Viernes de 19:00 a 20:00 y Gojira el Domingo de 22:00 a 23:30',
      pdfs: [],
      images: []
    };

    const lineupResult = await extractLineupWithAi(scrapedData);
    
    assert.ok(lineupResult.edition);
    assert.ok(lineupResult.lineup);
    assert.strictEqual(lineupResult.lineup.length, 2);
    
    // Annisokay match
    const annis = lineupResult.lineup.find(a => a.artistName === 'Annisokay');
    assert.ok(annis);
    assert.match(annis.day, /^\d{4}-\d{2}-\d{2}$/);
    assert.strictEqual(annis.stage, 'Main Stage');
    assert.strictEqual(annis.startTime, '19:00');
  });

  // TEST 3: Búsqueda Spotify en modo Mock
  await runTestAsync('Gemini usa 3.5 Flash y conserva fallback ante modelos retirados', async () => {
    assert.strictEqual(DEFAULT_GEMINI_MODEL, 'gemini-3.5-flash');
    assert.strictEqual(ENRICHMENT_GEMINI_MODEL, 'gemini-3.1-flash-lite');
    assert.deepStrictEqual(getModelCandidates('gemini-2.5-flash'), ['gemini-2.5-flash', 'gemini-3.5-flash']);
    assert.deepStrictEqual(getModelCandidates('gemini-3.5-flash'), ['gemini-3.5-flash']);
    assert.deepStrictEqual(getModelCandidates(ENRICHMENT_GEMINI_MODEL), ['gemini-3.1-flash-lite', 'gemini-3.5-flash']);
  });

  await runTestAsync('El modo gratuito agrupa artistas y respeta la espera indicada por un 429', async () => {
    assert.strictEqual(getArtistBatchSize(false), 32);
    assert.strictEqual(getArtistBatchSize(true), 8);
    assert.strictEqual(parseRetryDelayMs('Please retry in 26.857275787s.'), 26858);
    assert.strictEqual(parseRetryDelayMs('sin tiempo indicado'), 60000);
    assert.strictEqual(getRetryWaitMs(59735), 62235);
    assert.strictEqual(getRetryWaitMs(120000), 70000);
    assert.strictEqual(FREE_TIER_MIN_INTERVAL_MS, 3500);
  });

  // TEST 5: Búsqueda Spotify en modo Mock
  await runTestAsync('Spotify en modo Mock busca artistas y resuelve IDs deterministas', async () => {
    const annisData = await searchSpotifyArtist('Annisokay');
    assert.ok(annisData);
    assert.strictEqual(annisData.spotifyId, '7lAi1Cv19DsukgGjbZQxFg');
    assert.ok(annisData.genres.includes('metalcore'));

    const randomData = await searchSpotifyArtist('Unknown Local Band');
    assert.ok(randomData);
    assert.strictEqual(randomData.name, 'Unknown Local Band');
    assert.ok(randomData.spotifyId.length === 22); // Check hex hash padding length
  });

  await runTestAsync('Spotify no inventa identificadores cuando faltan credenciales reales', async () => {
    const previousProvider = process.env.AI_PROVIDER;
    process.env.AI_PROVIDER = 'gemini';
    delete process.env.SPOTIFY_CLIENT_ID;
    delete process.env.SPOTIFY_CLIENT_SECRET;
    const result = await searchSpotifyArtist('Unknown Local Band');
    assert.strictEqual(result, null);
    process.env.AI_PROVIDER = previousProvider || 'mock';
  });

  console.log('\n==================================================');
  console.log(`Pruebas completadas: ${passedCount} / ${testCount} superadas.`);
  console.log('==================================================');

  // Clean shutdown
  targetServer.close(() => {
    if (passedCount === testCount) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  });
}

// Start execution
setTimeout(runBusinessTests, 1000);
