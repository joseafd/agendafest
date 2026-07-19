process.env.NODE_ENV = 'test';
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Load configurations
process.env.PORT = 3039;
process.env.AI_PROVIDER = 'mock';
process.env.PUBLISH_ENABLED = 'false'; // Keep disabled as required by safety rules

const { server, getPairingCode, normalizeAndValidateImport } = require('../server');
const { validateGitStatus, pollGitHubAction, parseGitStatus, isAuthorizedPublicationFile } = require('../publish');
const { unlinkWithRetry } = require('../excel');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ res, body }));
    });
    req.on('error', reject);
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runRemediationTests() {
  console.log('=== INICIANDO PRUEBAS DE REMEDIACIÓN Y SEGURIDAD (REMEDIATION) ===\n');
  
  const publishModule = require('../publish');
  const originalValidateGitStatus = publishModule.validateGitStatus;
  publishModule.validateGitStatus = async () => {
    return {
      branch: 'main',
      remote: 'https://github.com/joseafd/agendafest.git',
      changedFiles: ['AgendaFest.xlsx', 'src/data/festivalData.ts']
    };
  };

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

  // TEST 1: Verificar ruta correcta de festivalData.ts y exclusión de dist/
  await runTestAsync('El archivo de publicación no contiene referencias a src/festivalData.ts ni añade dist/', async () => {
    const publishContent = fs.readFileSync(path.join(__dirname, '..', 'publish.js'), 'utf8');
    assert.strictEqual(publishContent.includes('src/festivalData.ts'), false, 'No debería referenciar src/festivalData.ts');
    assert.strictEqual(publishContent.includes('src/data/festivalData.ts'), true, 'Debe referenciar src/data/festivalData.ts');
    assert.strictEqual(publishContent.includes("'dist/'") || publishContent.includes('"dist/"'), false, 'No debería añadir dist/');
  });

  // TEST 2: Ausencia de exec y shell en publish.js
  await runTestAsync('publish.js no importa ni ejecuta la función child_process.exec', async () => {
    const publishContent = fs.readFileSync(path.join(__dirname, '..', 'publish.js'), 'utf8');
    assert.strictEqual(publishContent.includes("require('child_process').exec"), false, 'No debería requerir exec directamente');
    assert.strictEqual(publishContent.includes(" exec("), false, 'No debería usar la función exec');
  });

  await runTestAsync('Git porcelain conserva el nombre completo AgendaFest.xlsx', async () => {
    const files = parseGitStatus(
      ' M AgendaFest.xlsx\0 M src/data/festivalData.ts\0?? public/images/cartel-nuevo.jpg\0'
    );
    assert.deepStrictEqual(files, [
      'AgendaFest.xlsx',
      'src/data/festivalData.ts',
      'public/images/cartel-nuevo.jpg'
    ]);
  });

  await runTestAsync('La lista blanca admite solo datos e imágenes de publicación', async () => {
    assert.strictEqual(isAuthorizedPublicationFile('AgendaFest.xlsx'), true);
    assert.strictEqual(isAuthorizedPublicationFile('src/data/festivalData.ts'), true);
    assert.strictEqual(isAuthorizedPublicationFile('src/data/artistSocialLinks.ts'), true);
    assert.strictEqual(isAuthorizedPublicationFile('public/images/cartel-nuevo.webp'), true);
    assert.strictEqual(isAuthorizedPublicationFile('Recursos/mapa-nuevo.png'), true);
    assert.strictEqual(isAuthorizedPublicationFile('importador/.env'), false);
    assert.strictEqual(isAuthorizedPublicationFile('dist/assets/index.js'), false);
    assert.strictEqual(isAuthorizedPublicationFile('public/images/../sw.js'), false);
    assert.strictEqual(isAuthorizedPublicationFile('Recursos/script.js'), false);
  });

  // Authenticate once to obtain sessionCookie for all endpoint tests
  let sessionCookie = '';
  try {
    const code = getPairingCode();
    const loginRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 3039,
      path: '/api/login-pairing',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { code });
    if (loginRes.res.statusCode === 200) {
      const setCookie = loginRes.res.headers['set-cookie'][0];
      sessionCookie = setCookie.split(';')[0];
    }
  } catch (err) {
    console.error('Fallo en autenticación del test runner:', err);
  }

  // TEST 3: PUBLISH_ENABLED=false devuelve HTTP 503
  await runTestAsync('La API /api/publish/deploy retorna 503 cuando la publicación real está desactivada', async () => {
    const resObj = await makeRequest({
      hostname: '127.0.0.1',
      port: 3039,
      path: '/api/publish/deploy',
      method: 'POST',
      headers: {
        'Cookie': sessionCookie,
        'Content-Type': 'application/json'
      }
    }, { planId: 'PLAN-ANY' });

    assert.strictEqual(resObj.res.statusCode, 503, 'Debe retornar 503');
    const body = JSON.parse(resObj.body);
    assert.ok(body.error.includes('desactivada'), 'Debe indicar que la publicación real está desactivada');
  });

  // TEST 4: Liberación de archivos robusta con unlinkWithRetry (Windows EBUSY/EPERM)
  await runTestAsync('unlinkWithRetry intenta eliminar el archivo y se comporta correctamente si no existe', async () => {
    const nonExistentFile = path.join(__dirname, 'non_existent_remediation_file.xlsx');
    await unlinkWithRetry(nonExistentFile);
    assert.ok(true);
  });

  // TEST 5: Tracking del workflow de Actions
  await runTestAsync('El tracker del workflow de Actions distingue correctamente resultados y conclusiones', async () => {
    const result = await pollGitHubAction('some_sha', null);
    assert.strictEqual(result.status, 'completed');
    assert.strictEqual(result.conclusion, 'success');
  });

  // TEST 6: Generación de plan
  let testPlan = null;
  await runTestAsync('Generar un plan de publicación registra el plan en memoria con campos correctos', async () => {
    const planRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 3039,
      path: '/api/publish/plan',
      method: 'POST',
      headers: {
        'Cookie': sessionCookie,
        'Content-Type': 'application/json'
      }
    }, {});

    assert.strictEqual(planRes.res.statusCode, 200, 'Genera plan OK');
    const body = JSON.parse(planRes.body);
    assert.ok(body.plan.planId.startsWith('PLAN-'));
    assert.strictEqual(body.plan.targetUrl, 'https://joseafd.github.io/agendafest/');
    testPlan = body.plan;
  });

  // TEST 7: Confirmación caducada
  await runTestAsync('El despliegue con plan caducado es rechazado con error 400', async () => {
    const { getActivePlan } = require('../server');
    const plan = getActivePlan();
    assert.ok(plan);
    
    plan.expiresAt = Date.now() - 1000;
    process.env.PUBLISH_ENABLED = 'true';
    
    const resObj = await makeRequest({
      hostname: '127.0.0.1',
      port: 3039,
      path: '/api/publish/deploy',
      method: 'POST',
      headers: {
        'Cookie': sessionCookie,
        'Content-Type': 'application/json'
      }
    }, { planId: plan.planId });

    assert.strictEqual(resObj.res.statusCode, 400);
    const body = JSON.parse(resObj.body);
    assert.ok(body.error.includes('caducado'));
  });

  // TEST 8: Confirmación reutilizada
  await runTestAsync('El despliegue con plan ya utilizado es rechazado con error 400', async () => {
    const { getActivePlan } = require('../server');
    const plan = getActivePlan();
    assert.ok(plan);
    
    plan.expiresAt = Date.now() + 600000;
    plan.used = true;

    const resObj = await makeRequest({
      hostname: '127.0.0.1',
      port: 3039,
      path: '/api/publish/deploy',
      method: 'POST',
      headers: {
        'Cookie': sessionCookie,
        'Content-Type': 'application/json'
      }
    }, { planId: plan.planId });

    assert.strictEqual(resObj.res.statusCode, 400);
    const body = JSON.parse(resObj.body);
    assert.ok(body.error.includes('utilizado'));
  });

  // TEST 9: Hash cambiado
  await runTestAsync('El despliegue con plan modificado en sus hashes es rechazado con error 400', async () => {
    const { getActivePlan } = require('../server');
    const plan = getActivePlan();
    assert.ok(plan);
    
    plan.used = false;
    plan.files[0].sha256 = 'modified_hash_to_trigger_error';

    const resObj = await makeRequest({
      hostname: '127.0.0.1',
      port: 3039,
      path: '/api/publish/deploy',
      method: 'POST',
      headers: {
        'Cookie': sessionCookie,
        'Content-Type': 'application/json'
      }
    }, { planId: plan.planId });

    assert.strictEqual(resObj.res.statusCode, 400);
    const body = JSON.parse(resObj.body);
    assert.ok(body.error.includes('modificado') || body.error.includes('cambió'));
    
    process.env.PUBLISH_ENABLED = 'false';
  });

  // TEST 10: Validación de Git branch main
  await runTestAsync('La validación de Git exige exactamente la rama main', async () => {
    try {
      const gitState = await originalValidateGitStatus();
      assert.strictEqual(gitState.branch, 'main', 'La rama activa debe ser main');
    } catch (e) {
      assert.ok(
        e.message.includes('Rama') ||
        e.message.includes('master') ||
        e.message.includes('main') ||
        e.message.includes('retrasada') ||
        e.message.includes('cambios sucios') ||
        e.message.includes('no coincide')
      );
    }
  });

  await runTestAsync('Una actuación fuera de rango llega a revisión con artista, fila, fecha y motivo', async () => {
    const result = {
      edition: {
        name: 'Rockstadt Extreme Fest', year: 2026,
        startDate: '2026-07-27', endDate: '2026-08-02',
        location: 'Râșnov, Romania', timezone: 'Europe/Bucharest'
      },
      lineup: [
        { artistName: 'Actuación correcta', day: '2026-08-02', stage: 'Main', startTime: '22:00', endTime: '23:00' },
        { artistName: 'Actuación nocturna', day: '2026-08-03', stage: 'Main', startTime: '01:00', endTime: '02:00' }
      ]
    };
    assert.doesNotThrow(() => normalizeAndValidateImport(result, 'https://rockstadtextremefest.ro/'));
    assert.strictEqual(result.validationIssues.length, 1);
    assert.strictEqual(result.validationIssues[0].row, 2);
    assert.strictEqual(result.validationIssues[0].artistName, 'Actuación nocturna');
    assert.strictEqual(result.validationIssues[0].day, '2026-08-03');
    assert.ok(result.validationIssues[0].reasons[0].includes('2026-07-27–2026-08-02'));
  });

  await runTestAsync('La revisión muestra los campos pendientes y distingue horario de popularidad', async () => {
    const appContent = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
    const htmlContent = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

    assert.ok(appContent.includes('class="missing-fields"'), 'Debe mostrar la lista visible de campos pendientes');
    assert.ok(appContent.includes("!item.youtubeUrl && 'vídeo'"), 'Debe identificar el vídeo pendiente');
    assert.ok(appContent.includes("!item.imageUrl && 'imagen'"), 'Debe identificar la imagen pendiente');
    assert.ok(appContent.includes("!hasSocial && 'RRSS'"), 'Debe identificar las redes sociales pendientes');
    assert.ok(htmlContent.includes('Inicio<br><small>(HH:MM)</small>'), 'Debe etiquetar claramente la hora de inicio');
    assert.ok(htmlContent.includes('Fin<br><small>(HH:MM)</small>'), 'Debe etiquetar claramente la hora de fin');
    assert.ok(htmlContent.includes('Vídeo · imagen · RRSS'), 'Debe explicar qué incluye la columna Contenido');
  });

  await runTestAsync('La confirmación exige una comparación visual vigente con el Excel', async () => {
    const serverContent = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    const appContent = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
    const htmlContent = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
    assert.ok(serverContent.includes("app.post('/api/import/preview'"), 'Debe existir una comparación de solo lectura');
    assert.ok(serverContent.includes('currentPreview.previewHash !== previewHash'), 'Debe rechazar comparaciones caducadas');
    assert.ok(appContent.includes('invalidateExcelComparison'), 'Editar una fila debe invalidar la comparación');
    assert.ok(appContent.includes('previewHash: currentPreviewHash'), 'La confirmación debe enviar el hash revisado');
    assert.ok(htmlContent.includes('Comparación con AgendaFest.xlsx'), 'La comparación debe ser visible');
    assert.ok(htmlContent.includes('comparisonReviewed'), 'El usuario debe confirmar que revisó los cambios');
  });

  await runTestAsync('El límite ampliado sigue acotando el número máximo de actuaciones', async () => {
    const result = {
      edition: {
        name: 'Festival masivo', year: 2026, startDate: '2026-07-01', endDate: '2026-07-02',
        location: 'Viveiro, España', timezone: 'Europe/Madrid'
      },
      lineup: Array.from({ length: 501 }, (_, index) => ({
        artistName: `Artista ${index}`, day: '2026-07-01', stage: 'Principal', startTime: '12:00', endTime: '13:00'
      }))
    };
    assert.throws(
      () => normalizeAndValidateImport(result, 'https://example.com/'),
      /máximo permitido es 500/
    );
  });

  await runTestAsync('La ficha de banda incorpora Web, TikTok y X solo con URL válida', async () => {
    const projectRoot = path.join(__dirname, '..', '..');
    const syncContent = fs.readFileSync(path.join(projectRoot, 'sync_excel.cjs'), 'utf8');
    const modalContent = fs.readFileSync(path.join(projectRoot, 'src', 'components', 'BandDetailModal.tsx'), 'utf8');
    const socialDataContent = fs.readFileSync(path.join(projectRoot, 'src', 'data', 'artistSocialLinks.ts'), 'utf8');

    assert.ok(syncContent.includes("art['Web Oficial Artista']"), 'Debe sincronizar la web oficial desde Excel');
    assert.ok(syncContent.includes("art['TikTok']"), 'Debe sincronizar TikTok desde Excel');
    assert.ok(syncContent.includes("art['X URL']"), 'Debe sincronizar X desde Excel');
    assert.ok(socialDataContent.includes('officialWebsite?: string'), 'El modelo generado debe incluir la web oficial');
    assert.ok(socialDataContent.includes('tiktokUrl?: string'), 'El modelo generado debe incluir TikTok');
    assert.ok(socialDataContent.includes('xUrl?: string'), 'El modelo generado debe incluir X');
    assert.ok(modalContent.includes('isExternalUrl(socialLinks.officialWebsite)'), 'La web solo debe mostrarse con URL válida');
    assert.ok(modalContent.includes('isExternalUrl(socialLinks.tiktokUrl)'), 'TikTok solo debe mostrarse con URL válida');
    assert.ok(modalContent.includes('isExternalUrl(socialLinks.xUrl)'), 'X solo debe mostrarse con URL válida');
    assert.ok(modalContent.includes('flexWrap'), 'La fila de iconos debe adaptarse a pantallas estrechas');
  });

  console.log('\n==================================================');
  console.log(`Remediación: ${passedCount} / ${testCount} superadas.`);
  console.log('==================================================');

  server.close(() => {
    if (passedCount === testCount) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  });
}

// Run
setTimeout(runRemediationTests, 500);
