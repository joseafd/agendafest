process.env.NODE_ENV = 'test';
const assert = require('assert');
const http = require('http');
const { runV3Validation } = require('../publish');

// Start a local mock server representing the deployed production website
const productionServer = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  if (urlPath === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Resurrection Fest Production</title>
          <link rel="manifest" href="/manifest.json">
        </head>
        <body>
          <h1>Portal desplegado con datos diferidos</h1>
          <script src="/assets/index-mocked.js"></script>
        </body>
      </html>
    `);
  } else if (urlPath === '/manifest.json') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      name: "Resurrection Fest",
      short_name: "Resu",
      start_url: "/"
    }));
  } else if (urlPath === '/sw.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end(`
      // Service worker mock file
      self.addEventListener('install', (e) => {
        console.log('SW Installed');
      });
    `);
  } else if (urlPath === '/assets/index-mocked.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end(`${'x'.repeat(120 * 1024)};const lazyChunk="festivalData-mocked.js";`);
  } else if (urlPath === '/assets/festivalData-mocked.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end('const edition={edicionId:"resurrection-fest-2026"};');
  } else {
    res.writeHead(404);
    res.end();
  }
});

productionServer.listen(3033, '127.0.0.1');

async function runPublishTests() {
  console.log('=== INICIANDO PRUEBAS DE PUBLICACIÓN Y CICLO DE VIDA (INCREMENTO 4) ===\n');
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

  // TEST 1: Comprobación de Validación V3 exitosa
  await runTestAsync('La validación remota V3 audita exitosamente el portal, sw y manifest de producción', async () => {
    const results = await runV3Validation('http://127.0.0.1:3033', 'resurrection-fest-2026');
    console.log('TEST 1 Validation V3 Results:', JSON.stringify(results, null, 2));
    assert.strictEqual(results.webStatus.passed, true, 'El sitio web debería responder HTTP 200');
    assert.strictEqual(results.manifest.passed, true, 'El manifest.json debería ser válido');
    assert.strictEqual(results.serviceWorker.passed, true, 'El service worker sw.js debería ser válido');
    assert.strictEqual(results.editionCheck.passed, true, 'La edición resurrection-fest-2026 debería detectarse en los scripts');
    assert.ok(results.editionCheck.message.includes('bundle diferido'));
  });

  // TEST 2: Comprobación de Validación V3 con fallos
  await runTestAsync('La validación remota V3 reporta fallos si faltan recursos del portal', async () => {
    // Check against a server that doesn't have SW/Manifest
    const partialServer = http.createServer((req, res) => {
      const urlPath = req.url.split('?')[0];
      if (urlPath === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html>Old version</html>');
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise((resolve) => partialServer.listen(3034, '127.0.0.1', resolve));

    const results = await runV3Validation('http://127.0.0.1:3034', 'resurrection-fest-2026');

    assert.strictEqual(results.webStatus.passed, true, 'Sitio web responde OK');
    assert.strictEqual(results.manifest.passed, false, 'manifest.json debería fallar (404)');
    assert.strictEqual(results.serviceWorker.passed, false, 'sw.js debería fallar (404)');
    assert.strictEqual(results.editionCheck.passed, false, 'La edición no debería encontrarse');

    await new Promise((resolve) => partialServer.close(resolve));
  });

  console.log('\n==================================================');
  console.log(`Pruebas completadas: ${passedCount} / ${testCount} superadas.`);
  console.log('==================================================');

  productionServer.close(() => {
    if (passedCount === testCount) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  });
}

// Start tests
setTimeout(runPublishTests, 500);
