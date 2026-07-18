const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { exec } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const {
  validateUrl,
  resolveAndValidateIp,
  generatePairingCode,
  verifyPairingCodeAndGenerateToken,
  verifySessionToken,
  validateOrigin
} = require('./security');

const { scrapeFestival } = require('./scraper');
const { extractLineupWithAi, enrichArtistsWithAi } = require('./gemini');
const { searchSpotifyArtist } = require('./spotify');
const { saveImportToExcel } = require('./excel');
const publish = require('./publish');

const PUBLISH_ENABLED = process.env.PUBLISH_ENABLED === 'true';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

let activePublicationPlan = null;
const crypto = require('crypto');

function getFileSha256(filePath) {
  if (!fs.existsSync(filePath)) return '';
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

const activeImports = {};

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function normalizeAndValidateImport(result, sourceUrl) {
  if (!result || !result.edition || !Array.isArray(result.lineup) || result.lineup.length === 0) {
    throw new Error('Gemini no devolvió una edición con actuaciones verificables.');
  }
  const edition = result.edition;
  edition.name = String(edition.name || '').trim();
  edition.year = Number(edition.year);
  edition.url = sourceUrl;
  if (!edition.name || !Number.isInteger(edition.year)) {
    throw new Error('Faltan el nombre o el año de la edición.');
  }
  for (const field of ['startDate', 'endDate']) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(edition[field] || ''))) {
      throw new Error(`La edición no contiene ${field} en formato YYYY-MM-DD.`);
    }
  }
  const start = Date.parse(`${edition.startDate}T00:00:00Z`);
  const end = Date.parse(`${edition.endDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    throw new Error('El intervalo de fechas de la edición no es válido.');
  }
  if (!String(edition.location || '').trim() || !String(edition.timezone || '').trim()) {
    throw new Error('Faltan la localidad o la zona horaria de la edición.');
  }
  edition.festivalId = slugify(edition.name.replace(new RegExp(`\\s*${edition.year}\\s*$`), ''));
  edition.id = `${edition.festivalId}-${edition.year}`;
  if (!edition.festivalId) throw new Error('No se pudo generar el identificador del festival.');

  result.lineup.forEach((item, index) => {
    const validTime = value => {
      const match = /^(\d{2}):(\d{2})$/.exec(String(value || ''));
      return Boolean(match && Number(match[1]) <= 23 && Number(match[2]) <= 59);
    };
    if (!item.artistName || !item.stage || !validTime(item.startTime) || !validTime(item.endTime)) {
      throw new Error(`La actuación ${index + 1} tiene campos obligatorios inválidos.`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(item.day || ''))) {
      throw new Error(`La actuación ${index + 1} no tiene fecha YYYY-MM-DD.`);
    }
    const actDate = Date.parse(`${item.day}T00:00:00Z`);
    if (!Number.isFinite(actDate) || actDate < start || actDate > end) {
      throw new Error(`La actuación ${index + 1} queda fuera de las fechas de la edición.`);
    }
  });
  return result;
}

const app = express();
const PORT = process.env.PORT || 3030;
const HOST = '127.0.0.1'; // Escuchar exclusivamente en localhost IPv4

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(validateOrigin);

// Generate pairing code on boot (valid for 60 seconds)
const pairingCode = generatePairingCode();

// Middleware to verify session cookie
function requireAuth(req, res, next) {
  const cookieToken = req.cookies.af_session_token;
  if (cookieToken && verifySessionToken(cookieToken)) {
    next();
  } else {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'No autorizado. Sesión inválida o expirada.' });
    }
    // Serve clean pairing page instead of redirecting to login.html
    res.status(403).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>AgendaFest - Emparejamiento</title>
          <style>
            body { background: #0d0d0f; color: #f3f4f6; font-family: sans-serif; text-align: center; padding: 100px 20px; }
            .card { background: #151518; border: 1px solid #2a2a30; border-radius: 12px; padding: 32px; max-width: 400px; margin: 0 auto; box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
            input { width: 100%; box-sizing: border-box; background: #1e1e24; border: 1px solid #2a2a30; border-radius: 6px; color: #f3f4f6; padding: 12px; font-size: 16px; text-align: center; margin-bottom: 20px; }
            button { width: 100%; background: #d3133c; color: white; border: none; border-radius: 6px; padding: 12px; font-size: 16px; font-weight: bold; cursor: pointer; }
            button:hover { background: #b00f31; }
            .error { color: #ef4444; margin-top: 15px; display: none; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>🤘 AgendaFest</h2>
            <p style="color:#9ca3af; font-size:14px; margin-bottom:20px;">
              Introduce el código de emparejamiento temporal generado en la consola.
            </p>
            <input type="text" id="code" placeholder="CÓDIGO (6 caracteres)">
            <button onclick="submitCode()">Vincular Sesión</button>
            <div id="error" class="error"></div>
          </div>
          <script>
            async function submitCode() {
              const code = document.getElementById('code').value;
              const errorDiv = document.getElementById('error');
              errorDiv.style.display = 'none';

              try {
                const res = await fetch('/api/login-pairing', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ code })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                  window.location.reload();
                } else {
                  errorDiv.textContent = data.error || 'Código incorrecto o expirado.';
                  errorDiv.style.display = 'block';
                }
              } catch (e) {
                errorDiv.textContent = 'Error de conexión.';
                errorDiv.style.display = 'block';
              }
            }
          </script>
        </body>
      </html>
    `);
  }
}

// Pairing API endpoint
app.post('/api/login-pairing', (req, res) => {
  const { code } = req.body;
  const token = verifyPairingCodeAndGenerateToken(code);
  
  if (token) {
    // Set HttpOnly, SameSite=Strict cookie (Without secure attribute because we are on HTTP local connection)
    res.cookie('af_session_token', token, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/'
    });
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Código inválido, ya utilizado o expirado (límite 60s).' });
  }
});

// Auth Logout API
app.post('/api/logout', (req, res) => {
  res.clearCookie('af_session_token');
  res.json({ success: true });
});

// App Dashboard Page (Protected)
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Status API
app.get('/api/status', requireAuth, (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    aiProvider: process.env.AI_PROVIDER || 'mock',
    modelConfig: { model: process.env.IA_MODEL || 'mock-model', inputCostPm: 0.0, outputCostPm: 0.0 }
  });
});

// SSRF Secure Fetch test logic
function secureFetchTest(targetUrl, redirectCount = 0, callback) {
  let isFinished = false;
  const done = (err, result) => {
    if (isFinished) return;
    isFinished = true;
    callback(err, result);
  };

  if (redirectCount > 3) {
    return done(new Error('Demasiadas redirecciones (máx 3).'));
  }

  try {
    validateUrl(targetUrl);
  } catch (err) {
    return done(err);
  }

  const parsed = new URL(targetUrl);
  const hostname = parsed.hostname;
  const port = parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80);

  // Resolve and Pin IP address to prevent DNS rebinding
  resolveAndValidateIp(hostname, port)
    .then((pinnedIp) => {
      const isHttps = parsed.protocol === 'https:';

      const options = {
        hostname: pinnedIp, // DNS Pinning
        port: port,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: {
          'Host': hostname, // Host header mapping
          'User-Agent': 'AgendaFest-Importador-SSRF-Test/1.0.0',
          'Accept': 'text/html,application/xhtml+xml,text/plain'
        },
        rejectUnauthorized: true
      };

      const client = isHttps ? https : http;

      const clientReq = client.request(options, (clientRes) => {
        const statusCode = clientRes.statusCode;

        // Manual redirection handling to revalidate IP on each hop
        if (statusCode >= 300 && statusCode < 400 && clientRes.headers.location) {
          const redirectUrl = new URL(clientRes.headers.location, targetUrl).toString();
          clientReq.destroy();
          return secureFetchTest(redirectUrl, redirectCount + 1, done);
        }

        // Limit MIME Type
        const contentType = clientRes.headers['content-type'] || '';
        const allowedMime = ['text/html', 'application/xhtml+xml', 'text/plain'];
        const isAllowedMime = allowedMime.some(mime => contentType.toLowerCase().includes(mime));
        if (!isAllowedMime && contentType) {
          clientReq.destroy();
          return done(new Error('Tipo MIME no permitido. Solo se admite HTML o Texto.'));
        }

        let body = '';
        let isBinary = false;

        clientRes.on('data', (chunk) => {
          // Binary content sniffing to detect fake MIME types
          if (Buffer.isBuffer(chunk)) {
            for (let i = 0; i < Math.min(chunk.length, 512); i++) {
              const byte = chunk[i];
              if (byte === 0x00 || (byte < 0x09 && byte !== 0x0c && byte !== 0x0b) || (byte > 0x0e && byte < 0x20)) {
                isBinary = true;
                break;
              }
            }
          }

          if (isBinary) {
            clientReq.destroy();
            return done(new Error('Contenido binario detectado (MIME falso).'));
          }

          body += chunk.toString('utf8');
          // Limit preview download size to 50KB to prevent excessive memory/data consumption
          if (body.length > 50 * 1024) {
            clientReq.destroy();
            return done(new Error('Tamaño máximo de descarga superado para prueba (50KB).'));
          }
        });

        clientRes.on('end', () => {
          // Sanitize body output to prevent injection of malicious JavaScript or tags
          const sanitizedBody = body
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

          done(null, {
            status: statusCode,
            contentType: contentType,
            body: sanitizedBody
          });
        });
      });

      clientReq.on('error', (err) => {
        done(new Error('Error de conexión: ' + err.message));
      });

      clientReq.setTimeout(5000, () => {
        clientReq.destroy();
        done(new Error('Timeout de conexión (5s).'));
      });

      clientReq.end();
    })
    .catch((err) => {
      done(new Error('SSRF / DNS Rebinding bloqueado: ' + err.message));
    });
}

// Fetch URL (SSRF verification endpoint)
app.post('/api/fetch-url', requireAuth, (req, res) => {
  const { url } = req.body;
  
  secureFetchTest(url, 0, (err, result) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.json(result);
  });
});

// Check Git Status API
app.get('/api/check-git', requireAuth, (req, res) => {
  exec('git status --porcelain', { cwd: path.join(__dirname, '..') }, (err, stdout) => {
    if (err) {
      return res.status(500).json({ error: 'Error al comprobar Git: ' + err.message });
    }
    const isClean = stdout.trim() === '';
    res.json({
      isClean,
      porcelain: stdout,
      canPublishV3: isClean
    });
  });
});

// POST /api/import/init
app.post('/api/import/init', requireAuth, (req, res) => {
  const { url, name, edition } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'Falta la URL del festival.' });
  }

  const importId = 'IMP-' + Date.now();
  activeImports[importId] = {
    id: importId,
    url: url,
    name: name || '',
    edition: edition || '',
    state: 'CREADA',
    logs: [`[${new Date().toISOString()}] Transacción de importación iniciada para URL: ${url}`],
    result: null,
    error: null
  };

  res.json({ success: true, importId });
});

// POST /api/import/process
app.post('/api/import/process', requireAuth, (req, res) => {
  const { importId } = req.body;
  const transaction = activeImports[importId];

  if (!transaction) {
    return res.status(404).json({ error: 'Transacción no encontrada.' });
  }

  // Set state to EXTRAYENDO
  transaction.state = 'EXTRAYENDO';
  transaction.logs.push(`[${new Date().toISOString()}] Iniciando descarga y scraping de la web oficial...`);

  // Run asynchronously
  (async () => {
    try {
      // 1. Scraping official website
      const scrapedData = await scrapeFestival(transaction.url);
      transaction.logs.push(`[${new Date().toISOString()}] Descubrimiento completado. Recursos clasificados.`);
      
      if (scrapedData.pdfs.length > 0) {
        transaction.logs.push(`[${new Date().toISOString()}] Detección de ${scrapedData.pdfs.length} archivo(s) PDF. Texto extraído.`);
      }
      transaction.logs.push(`[${new Date().toISOString()}] Enlaces internos relevantes: ${Math.max(0, scrapedData.pages.length - 1)}. Imágenes enviadas a Gemini: ${scrapedData.images.filter(image => image.data).length}.`);
      
      // 2. Structuring with Gemini AI
      transaction.logs.push(`[${new Date().toISOString()}] Analizando contenidos con inteligencia artificial (Gemini)...`);
      const lineupResult = await extractLineupWithAi(scrapedData);
      normalizeAndValidateImport(lineupResult, transaction.url);
      if (!Array.isArray(lineupResult.lineup) || lineupResult.lineup.length === 0) {
        transaction.logs.push(`[${new Date().toISOString()}] No se detectaron actuaciones. El borrador requiere más fuentes o revisión.`);
      } else {
        transaction.logs.push(`[${new Date().toISOString()}] ${lineupResult.lineup.length} actuaciones estructuradas. Procesando artistas...`);
      }

      transaction.logs.push(`[${new Date().toISOString()}] Investigando país, género, bio, vídeo, imagen y redes sociales con fuentes web...`);
      lineupResult.lineup = await enrichArtistsWithAi(lineupResult.lineup, lineupResult.edition);
      transaction.logs.push(`[${new Date().toISOString()}] Metadatos artísticos investigados. Completando identificadores musicales...`);

      // 3. Spotify enrichment
      transaction.logs.push(`[${new Date().toISOString()}] Consultando identificadores de Spotify para artistas...`);
      for (const artist of lineupResult.lineup) {
        transaction.logs.push(`[${new Date().toISOString()}] Buscando en Spotify: ${artist.artistName}`);
        try {
          const spotifyData = await searchSpotifyArtist(artist.artistName);
          if (spotifyData) {
            artist.spotifyId = spotifyData.spotifyId;
            artist.spotifyGenres = spotifyData.genres;
            artist.spotifyPopularity = spotifyData.popularity;
            artist.spotifyUrl = spotifyData.url;
            artist.genre = artist.genre || spotifyData.genres?.[0] || '';
            artist.imageUrl = artist.imageUrl || spotifyData.imageUrl || '';
            transaction.logs.push(`[${new Date().toISOString()}] Spotify ID encontrado para ${artist.artistName}: ${spotifyData.spotifyId}`);
          } else {
            artist.spotifyId = '';
            transaction.logs.push(`[${new Date().toISOString()}] No se encontró perfil de Spotify para ${artist.artistName}`);
          }
        } catch (e) {
          artist.spotifyId = '';
          transaction.logs.push(`[${new Date().toISOString()}] Error consultando Spotify para ${artist.artistName}: ${e.message}`);
        }
      }

      transaction.logs.push(`[${new Date().toISOString()}] Proceso completado. Listo para revisión del administrador.`);
      transaction.result = lineupResult;
      transaction.state = 'PENDIENTE_REVISION';

    } catch (err) {
      transaction.state = 'FALLIDA';
      transaction.error = err.message;
      transaction.logs.push(`[${new Date().toISOString()}] ERROR CRÍTICO durante el procesamiento: ${err.message}`);
    }
  })();

  res.json({ success: true, state: 'EXTRAYENDO' });
});

app.get('/api/import/status/:id', requireAuth, (req, res) => {
  const transaction = activeImports[req.params.id];
  if (!transaction) {
    return res.status(404).json({ error: 'Transacción no encontrada.' });
  }
  res.json(transaction);
});

// POST /api/import/save
app.post('/api/import/save', requireAuth, async (req, res) => {
  const { importId, lineup } = req.body;
  const transaction = activeImports[importId];

  if (!transaction) {
    return res.status(404).json({ error: 'Transacción no encontrada.' });
  }

  if (!lineup || !Array.isArray(lineup) || lineup.length === 0) {
    return res.status(400).json({ error: 'Datos de cartel inválidos.' });
  }

  try {
    transaction.logs.push(`[${new Date().toISOString()}] Aplicando revisión manual e iniciando escritura transaccional...`);
    
    // Update the transaction in-memory lineup with approved user edits
    transaction.result.lineup = lineup;
    normalizeAndValidateImport(transaction.result, transaction.url);

    // Save to excel
    await saveImportToExcel(transaction.result, 'joseafd', importId);

    transaction.state = 'REVISADA';
    transaction.logs.push(`[${new Date().toISOString()}] Transacción finalizada y guardada con éxito en AgendaFest.xlsx.`);
    res.json({ success: true, state: 'REVISADA' });

  } catch (err) {
    transaction.logs.push(`[${new Date().toISOString()}] ERROR al guardar en Excel: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
});

// GET /api/publish/config
app.get('/api/publish/config', requireAuth, (req, res) => {
  res.json({ publishEnabled: process.env.PUBLISH_ENABLED === 'true' });
});

// POST /api/publish/plan
app.post('/api/publish/plan', requireAuth, async (req, res) => {
  const { importId } = req.body;
  try {
    await publish.validateGitStatus();

    const excelFile = path.join(__dirname, '..', 'AgendaFest.xlsx');
    const tsFile = path.join(__dirname, '..', 'src', 'data', 'festivalData.ts');

    const excelSha = getFileSha256(excelFile);
    const tsSha = getFileSha256(tsFile);

    const planId = 'PLAN-' + crypto.randomBytes(8).toString('hex').toUpperCase();
    const expiresAt = Date.now() + 600000; // 10 minutes

    const targetUrl = 'https://joseafd.github.io/agendafest/';
    let edicionId = 'resurrection-fest-2026';
    if (importId && activeImports[importId]) {
      if (activeImports[importId].result && activeImports[importId].result.edition) {
        edicionId = activeImports[importId].result.edition.id;
      }
    }

    activePublicationPlan = {
      planId,
      importId,
      state: 'PENDING',
      expiresAt,
      files: [
        { name: 'AgendaFest.xlsx', sha256: excelSha, path: excelFile },
        { name: 'src/data/festivalData.ts', sha256: tsSha, path: tsFile }
      ],
      commitMessage: `feat: importacion festival [${importId || 'MANUAL'}]`,
      targetUrl,
      edicionId,
      logs: [`[${new Date().toISOString()}] Plan de publicación generado exitosamente.`]
    };

    res.json({ success: true, plan: activePublicationPlan });
  } catch (err) {
    res.status(400).json({ error: 'Fallo al generar el plan de publicación: ' + err.message });
  }
});

// GET /api/publish/status/:planId
app.get('/api/publish/status/:planId', requireAuth, (req, res) => {
  const { planId } = req.params;
  if (!activePublicationPlan || activePublicationPlan.planId !== planId) {
    return res.status(404).json({ error: 'Plan de publicación no encontrado.' });
  }
  res.json({ success: true, plan: activePublicationPlan });
});

// POST /api/publish/build
app.post('/api/publish/build', requireAuth, async (req, res) => {
  try {
    const logs = await publish.runLocalBuild();
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ error: 'Fallo al compilar localmente: ' + err.message });
  }
});

// POST /api/publish/deploy
app.post('/api/publish/deploy', requireAuth, async (req, res) => {
  if (process.env.PUBLISH_ENABLED !== 'true') {
    return res.status(503).json({ error: 'Publicación real desactivada. Configure PUBLISH_ENABLED=true.' });
  }

  const { planId } = req.body;
  if (!planId || !activePublicationPlan || activePublicationPlan.planId !== planId) {
    return res.status(400).json({ error: 'Plan de publicación inválido o no encontrado.' });
  }

  if (activePublicationPlan.used) {
    return res.status(400).json({ error: 'Este plan de publicación ya ha sido utilizado.' });
  }

  activePublicationPlan.used = true;

  if (Date.now() > activePublicationPlan.expiresAt) {
    activePublicationPlan.state = 'ERROR_DESPLIEGUE';
    activePublicationPlan.logs.push('Plan caducado después de 10 minutos.');
    return res.status(400).json({ error: 'El plan de publicación ha caducado.' });
  }

  // Verify file hashes did not change
  for (const f of activePublicationPlan.files) {
    const currentSha = getFileSha256(f.path);
    if (currentSha !== f.sha256) {
      activePublicationPlan.state = 'ERROR_DESPLIEGUE';
      activePublicationPlan.logs.push(`El archivo ${f.name} cambió después de generar el plan.`);
      return res.status(400).json({ error: `El archivo ${f.name} fue modificado después de generar el plan.` });
    }
  }

  let gitState;
  try {
    gitState = await publish.validateGitStatus();
  } catch (err) {
    activePublicationPlan.state = 'ERROR_DESPLIEGUE';
    activePublicationPlan.logs.push('El estado de Git cambió: ' + err.message);
    return res.status(400).json({ error: 'El estado de Git ha cambiado desde la generación del plan: ' + err.message });
  }

  try {
    activePublicationPlan.state = 'DEPLOYING';
    activePublicationPlan.logs.push('Iniciando commit y push Git...');

    const deployResult = await publish.runGitDeploy(activePublicationPlan.importId || 'MANUAL', gitState.branch);
    
    activePublicationPlan.commitSha = deployResult.sha;
    activePublicationPlan.state = 'PUSHED';
    activePublicationPlan.logs.push(deployResult.logs);

    // Trigger async background monitoring of the workflow
    monitorWorkflow(activePublicationPlan);

    res.json({ success: true, plan: activePublicationPlan });
  } catch (err) {
    activePublicationPlan.state = 'ERROR_DESPLIEGUE';
    activePublicationPlan.logs.push('Fallo en el despliegue Git: ' + err.message);
    res.status(500).json({ error: 'Fallo al desplegar en Git: ' + err.message });
  }
});

// POST /api/publish/validate
app.post('/api/publish/validate', requireAuth, async (req, res) => {
  const { url, edicionId } = req.body;
  if (!url || !edicionId) {
    return res.status(400).json({ error: 'Faltan parámetros URL o edicionId para validar.' });
  }
  try {
    const results = await publish.runV3Validation(url, edicionId);
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: 'Error durante la verificación V3: ' + err.message });
  }
});

async function monitorWorkflow(plan) {
  try {
    plan.logs.push(`Iniciando seguimiento de GitHub Actions para commit ${plan.commitSha.substring(0, 7)}...`);
    const runResult = await publish.pollGitHubAction(plan.commitSha, GITHUB_TOKEN);
    plan.logs.push(`GitHub Action finalizada con estado: ${runResult.status}, conclusión: ${runResult.conclusion}`);
    
    if (runResult.conclusion === 'success') {
      plan.state = 'VALIDATING';
      plan.logs.push(`Iniciando prueba de humo remota V3 en ${plan.targetUrl}...`);
      const v3Results = await publish.runV3Validation(plan.targetUrl, plan.edicionId);
      plan.v3Results = v3Results;
      
      const allPassed = v3Results.webStatus.passed &&
                        v3Results.manifest.passed &&
                        v3Results.serviceWorker.passed &&
                        v3Results.editionCheck.passed;
      if (allPassed) {
        plan.state = 'PUBLICADA';
        plan.logs.push('¡Publicación exitosa! Todos los checks V3 han pasado.');
        if (plan.importId && activeImports[plan.importId]) {
          activeImports[plan.importId].state = 'PUBLICADA';
          activeImports[plan.importId].logs.push(`Publicación finalizada con éxito.`);
        }
      } else {
        plan.state = 'ERROR_DESPLIEGUE';
        plan.logs.push('Fallo de validación remota V3.');
      }
    } else {
      plan.state = 'ERROR_DESPLIEGUE';
      plan.logs.push(`Error de despliegue en CI/CD: ${runResult.conclusion}`);
    }
  } catch (err) {
    plan.state = 'ERROR_DESPLIEGUE';
    plan.logs.push(`Excepción en el workflow de seguimiento: ${err.message}`);
  }
}

// Serve public static files securely
app.use(express.static(path.join(__dirname, 'public')));

// Global Fallback Error Handler (prevents stack traces from leaking)
app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Start server on 127.0.0.1 only
const server = app.listen(PORT, HOST, () => {
  console.log(`==================================================`);
  console.log(`🤘 AgendaFest - Importador Local Iniciado Correctamente`);
  console.log(`--------------------------------------------------`);
  console.log(`AVISO: Conexión local HTTP no cifrada`);
  console.log(`(Acceso restringido a loopback mediante token de`);
  console.log(`emparejamiento de un solo uso, caduca en 60s)`);
  console.log(`--------------------------------------------------`);
  if (pairingCode) {
    console.log(`Código de Emparejamiento: ${pairingCode}`);
    console.log(`Abre en tu navegador: http://127.0.0.1:${PORT}/`);
  } else {
    console.log(`Código expirado o ya utilizado. Reinicia el servidor.`);
  }
  console.log(`==================================================`);
});

module.exports = {
  server,
  getPairingCode: () => pairingCode,
  getSessionToken: () => require('./security').getSessionToken(),
  getActivePlan: () => activePublicationPlan,
  setActivePlan: (val) => { activePublicationPlan = val; }
};
