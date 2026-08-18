process.env.NODE_ENV = 'test';
process.env.PORT = 3041;
process.env.AI_PROVIDER = 'mock';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const {
  detectImage,
  publicResource,
  storeTemporaryResource,
  applyResourceNamesToEdition,
  mergeScheduleImages,
  commitTemporaryResources,
  rollbackResourceCommit,
  finalizeResourceCommit,
  cleanupImportResources
} = require('../resources');
const { server, getPairingCode } = require('../server');

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

function request({ path: requestPath, method = 'GET', headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: 3041, path: requestPath, method, headers }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ res, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function run() {
  let tests = 0;
  let passed = 0;
  async function test(name, fn) {
    tests++;
    try {
      await fn();
      passed++;
      console.log(`🟢 TEST ${tests} PASADO: ${name}`);
    } catch (error) {
      console.error(`🔴 TEST ${tests} FALLADO: ${name}`);
      console.error(error);
    }
  }

  await test('valida la firma real y no confía solo en extensión o MIME', () => {
    assert.deepStrictEqual(detectImage(PNG_1X1), { extension: 'png', mimeType: 'image/png' });
    assert.strictEqual(detectImage(Buffer.from('<svg><script>alert(1)</script></svg>')), null);
    assert.throws(() => storeTemporaryResource({
      importId: 'IMP-12345678', type: 'logo', originalName: 'logo.jpg',
      declaredMimeType: 'image/jpeg', buffer: PNG_1X1, existingResources: []
    }), /no coincide/);
  });

  await test('normaliza nombres, sustituye recursos únicos y no expone rutas temporales', () => {
    const importId = 'IMP-RESOURCE-UNIT-1';
    let resources = storeTemporaryResource({
      importId, type: 'cartel', originalName: '../../cartel inicial.png',
      declaredMimeType: 'image/png', buffer: PNG_1X1, existingResources: []
    });
    const firstPath = resources[0].tempPath;
    resources = storeTemporaryResource({
      importId, type: 'cartel', originalName: 'cartel definitivo.png',
      declaredMimeType: 'image/png', buffer: PNG_1X1, existingResources: resources
    });
    assert.strictEqual(resources.length, 1);
    assert.strictEqual(resources[0].originalName, 'cartel definitivo.png');
    assert.strictEqual(fs.existsSync(firstPath), false);
    assert.strictEqual(Object.hasOwn(publicResource(resources[0]), 'tempPath'), false);
    cleanupImportResources(importId, resources);
  });

  await test('asigna nombres deterministas y prioriza horarios adjuntos para Gemini', () => {
    const importId = 'IMP-RESOURCE-UNIT-2';
    let resources = storeTemporaryResource({
      importId, type: 'horario', originalName: 'viernes.png',
      declaredMimeType: 'image/png', buffer: PNG_1X1, existingResources: []
    });
    resources = storeTemporaryResource({
      importId, type: 'horario', originalName: 'sabado.png',
      declaredMimeType: 'image/png', buffer: PNG_1X1, existingResources: resources
    });
    const edition = { festivalId: 'Festival Prueba', year: 2027 };
    resources = applyResourceNamesToEdition(edition, resources);
    assert.deepStrictEqual(edition.horarios, [
      'horariosfestivalprueba2027-01.png',
      'horariosfestivalprueba2027-02.png'
    ]);
    const images = mergeScheduleImages(resources, [{ url: 'https://example.com/web.png', mimeType: 'image/png', data: PNG_1X1.toString('base64') }]);
    assert.strictEqual(images[0].source, 'uploaded-schedule');
    assert.strictEqual(images[1].source, 'uploaded-schedule');
    assert.strictEqual(images[2].url, 'https://example.com/web.png');
    cleanupImportResources(importId, resources);
  });

  await test('revierte un recurso confirmado si la operación posterior falla', () => {
    const importId = 'IMP-RESOURCE-ROLLBACK';
    let resources = storeTemporaryResource({
      importId, type: 'mapa', originalName: 'mapa.png',
      declaredMimeType: 'image/png', buffer: PNG_1X1, existingResources: []
    });
    const edition = { festivalId: `prueba-rollback-${Date.now()}`, year: 2027 };
    resources = applyResourceNamesToEdition(edition, resources);
    const destination = path.join(__dirname, '..', '..', 'Recursos', resources[0].plannedName);
    const handle = commitTemporaryResources(resources, edition);
    assert.strictEqual(fs.existsSync(destination), true);
    rollbackResourceCommit(handle);
    assert.strictEqual(fs.existsSync(destination), false);
    finalizeResourceCommit(handle, importId, resources);
  });

  let sessionCookie = '';
  await test('la API autentica, carga, informa y cancela sin revelar rutas locales', async () => {
    const login = await request({
      path: '/api/login-pairing', method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: Buffer.from(JSON.stringify({ code: getPairingCode() }))
    });
    assert.strictEqual(login.res.statusCode, 200);
    sessionCookie = login.res.headers['set-cookie'][0].split(';')[0];
    const init = await request({
      path: '/api/import/init', method: 'POST',
      headers: { Cookie: sessionCookie, 'Content-Type': 'application/json' },
      body: Buffer.from(JSON.stringify({ url: 'https://example.com/festival' }))
    });
    assert.strictEqual(init.res.statusCode, 200);
    const importId = JSON.parse(init.body).importId;
    const upload = await request({
      path: `/api/import/resources?importId=${encodeURIComponent(importId)}&type=cartel`, method: 'POST',
      headers: {
        Cookie: sessionCookie,
        'Content-Type': 'image/png',
        'Content-Length': PNG_1X1.length,
        'X-File-Name': encodeURIComponent('../cartel.png')
      },
      body: PNG_1X1
    });
    assert.strictEqual(upload.res.statusCode, 200);
    const status = await request({ path: `/api/import/status/${importId}`, headers: { Cookie: sessionCookie } });
    const statusBody = JSON.parse(status.body);
    assert.strictEqual(statusBody.resources[0].originalName, 'cartel.png');
    assert.strictEqual(JSON.stringify(statusBody).includes('tempPath'), false);
    const cancel = await request({
      path: '/api/import/cancel', method: 'POST',
      headers: { Cookie: sessionCookie, 'Content-Type': 'application/json' },
      body: Buffer.from(JSON.stringify({ importId }))
    });
    assert.strictEqual(cancel.res.statusCode, 200);
  });

  server.close(() => {
    console.log(`\nPruebas de recursos: ${passed} / ${tests} superadas.`);
    process.exit(passed === tests ? 0 : 1);
  });
}

run().catch(error => {
  console.error(error);
  server.close(() => process.exit(1));
});
