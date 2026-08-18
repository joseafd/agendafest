const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { resolveAndValidateIp } = require('./security');

const rootDir = path.join(__dirname, '..');

/**
 * Executes a Git command safely with arguments array and shell: false.
 * @param {string[]} args Command arguments.
 * @param {number} timeout Timeout in milliseconds.
 * @returns {Promise<string>} stdout output.
 */
function runGitCommand(args, timeout = 30000, options = {}) {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd: rootDir, timeout, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(stderr.trim() || stdout.trim() || err.message));
      }
      resolve(options.preserveLeading ? stdout.replace(/\s+$/, '') : stdout.trim());
    });
  });
}

const FIXED_PUBLICATION_FILES = new Set([
  'AgendaFest.xlsx',
  'src/data/festivalData.ts',
  'src/data/artistSocialLinks.ts'
]);
const PUBLICATION_IMAGE_PATTERN = /^(?:public\/images|Recursos)\/[^/]+\.(?:png|jpe?g|webp|gif|svg)$/i;

function normalizePublicationFile(file) {
  return String(file || '').replace(/\\/g, '/');
}

function isAuthorizedPublicationFile(file) {
  const normalized = normalizePublicationFile(file);
  return FIXED_PUBLICATION_FILES.has(normalized) || PUBLICATION_IMAGE_PATTERN.test(normalized);
}

function buildImportPublicationFiles(resources = []) {
  const files = new Set(FIXED_PUBLICATION_FILES);
  for (const resource of resources) {
    const rawName = String(resource?.plannedName || '');
    const plannedName = path.basename(rawName);
    if (!plannedName || plannedName !== rawName) {
      throw new Error('El recurso confirmado no tiene un nombre de publicación válido.');
    }
    const resourceFile = `Recursos/${plannedName}`;
    if (!isAuthorizedPublicationFile(resourceFile)) {
      throw new Error(`Recurso no autorizado para publicación: "${resourceFile}"`);
    }
    files.add(resourceFile);
    if (['cartel', 'logo', 'mapa'].includes(resource.type)) {
      files.add(`public/images/${plannedName}`);
    }
  }
  return [...files];
}

function selectImportPublicationFiles(changedFiles, expectedFiles) {
  const changed = [...new Set((changedFiles || []).map(normalizePublicationFile))];
  const expected = new Set((expectedFiles || []).map(normalizePublicationFile));
  const unexpected = changed.filter(file => !expected.has(file));
  if (unexpected.length > 0) {
    throw new Error(
      `Hay cambios que no pertenecen a esta importación: ${unexpected.map(file => `"${file}"`).join(', ')}. ` +
      'Retíralos o guárdalos antes de generar el plan.'
    );
  }
  if (changed.length === 0) {
    throw new Error('No hay cambios pendientes para publicar.');
  }
  return changed;
}

function parseGitStatus(status) {
  if (!status) return [];
  const tokens = status.split('\0').filter(Boolean);
  const files = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const entry = tokens[index];
    const code = entry.slice(0, 2);
    const file = entry.slice(3).replace(/\\/g, '/');
    if (code.includes('R') || code.includes('C')) {
      throw new Error(`No se permiten renombrados o copias durante la publicación: "${file}"`);
    }
    if (code.includes('D')) {
      throw new Error(`No se permiten eliminaciones durante la publicación: "${file}"`);
    }
    files.push(file);
  }

  return files;
}

/**
 * Executes a Node or NPM command safely.
 * @param {string} file Executable path/name.
 * @param {string[]} args Command arguments.
 * @param {number} timeout Timeout in milliseconds.
 * @returns {Promise<string>} stdout output.
 */
function runNodeCommand(file, args, timeout = 60000) {
  return new Promise((resolve, reject) => {
    let executable = file;
    let cmdArgs = [...args];

    if (file === 'node') {
      executable = process.execPath;
    } else if (file === 'npm') {
      if (process.env.npm_execpath) {
        executable = process.execPath;
        cmdArgs = [process.env.npm_execpath, ...args];
      } else {
        executable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      }
    }

    execFile(executable, cmdArgs, { cwd: rootDir, timeout, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(stderr.trim() || stdout.trim() || err.message));
      }
      resolve(stdout.trim());
    });
  });
}

/**
 * Validates Git repository status, branch, conflicts, remote, and commits behind.
 * @returns {Promise<{branch: string, remote: string, changedFiles: string[]}>}
 */
async function validateGitStatus() {
  // 1. Root top level check
  const toplevel = await runGitCommand(['rev-parse', '--show-toplevel']);
  if (path.resolve(toplevel) !== path.resolve(rootDir)) {
    throw new Error('La raíz del repositorio no coincide con el directorio esperado.');
  }

  // 2. Active branch check
  const branch = await runGitCommand(['branch', '--show-current']);
  if (branch !== 'main') {
    throw new Error(`Rama incorrecta: "${branch}". Solo se permite publicar desde main.`);
  }

  // 3. Remote Origin URL check
  const remote = await runGitCommand(['remote', 'get-url', 'origin']);
  const expectedRemote = 'https://github.com/joseafd/agendafest.git';
  const expectedActionsRemote = 'https://github.com/joseafd/agendafest';
  const expectedSshRemote = 'git@github.com:joseafd/agendafest.git';
  if (remote !== expectedRemote && remote !== expectedActionsRemote && remote !== expectedSshRemote) {
    throw new Error(`Remoto no canónico: "${remote}". Debe ser ${expectedRemote}`);
  }

  // 4. Dirty files / uncommitted check (allow modifications ONLY to AgendaFest.xlsx and src/data/festivalData.ts)
  const status = await runGitCommand(['status', '--porcelain=v1', '-z'], 30000, { preserveLeading: true });
  const changedFiles = parseGitStatus(status);
  if (changedFiles.length > 0) {
    for (const file of changedFiles) {
      if (!isAuthorizedPublicationFile(file)) {
        throw new Error(`El repositorio contiene cambios sucios en archivos no autorizados: "${file}"`);
      }
    }
  }

  // 5. Check conflict markers in diff
  try {
    await runGitCommand(['diff', '--check']);
  } catch (err) {
    throw new Error('Se detectaron marcadores de conflicto de Git sin resolver: ' + err.message);
  }

  // 6. Fetch main
  await runGitCommand(['fetch', 'origin', branch]);

  // 7. Check if local is behind origin
  const countStr = await runGitCommand(['rev-list', '--left-right', '--count', `HEAD...origin/${branch}`]);
  const parts = countStr.split(/\s+/);
  const behindCount = parseInt(parts[1], 10);
  if (behindCount > 0) {
    throw new Error(`La rama local está retrasada por ${behindCount} commits respecto a origin/${branch}. Ejecuta git pull.`);
  }

  return { branch, remote, changedFiles };
}

/**
 * Runs the local excel synchronization and Vite production build.
 * @returns {Promise<string>} Build output logs.
 */
async function runLocalBuild() {
  const syncLogs = await runNodeCommand('node', [path.join(rootDir, 'sync_excel.cjs')]);
  const buildLogs = await runNodeCommand('npm', ['run', 'build']);
  return `--- Excel Sync Logs ---\n${syncLogs}\n\n--- Vite Build Logs ---\n${buildLogs}`;
}

/**
 * Commits the modified files and pushes to remote.
 * @param {string} importId Transaction ID.
 * @param {string} branch Active branch name.
 * @returns {Promise<{sha: string, logs: string}>} Git push logs and commit SHA.
 */
async function runGitDeploy(importId, branch, files) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('No hay archivos autorizados en el plan de publicación.');
  }
  for (const file of files) {
    if (!isAuthorizedPublicationFile(file)) {
      throw new Error(`Archivo no autorizado en el despliegue: "${file}"`);
    }
  }
  // Add exactly the authorized files only (dist/ must NEVER be added to main!)
  await runGitCommand(['add', '--', ...files]);
  await runGitCommand(['commit', '-m', `feat: importacion festival [${importId}]`]);
  const pushLogs = await runGitCommand(['push', 'origin', branch]);
  const sha = await runGitCommand(['rev-parse', 'HEAD']);
  return { sha, logs: pushLogs || 'Git push completado con éxito.' };
}

/**
 * Polls the GitHub Actions API to track the workflow execution of a specific commit SHA.
 * Public repositories can be queried without a token. Tests keep an isolated mock.
 * @param {string} sha Commit SHA.
 * @param {string} token GitHub personal access token.
 * @returns {Promise<{conclusion: string, status: string}>}
 */
function buildGitHubActionsRequest(sha, token) {
  const headers = {
    'User-Agent': 'AgendaFest-Publish-Monitor/1.0.0',
    'Accept': 'application/vnd.github.v3+json'
  };
  const normalizedToken = String(token || '').trim();
  if (normalizedToken) headers.Authorization = `Bearer ${normalizedToken}`;
  return {
    hostname: 'api.github.com',
    path: `/repos/joseafd/agendafest/actions/runs?head_sha=${encodeURIComponent(sha)}`,
    method: 'GET',
    headers
  };
}

function pollGitHubAction(sha, token) {
  return new Promise((resolve) => {
    if (!token && process.env.NODE_ENV === 'test') {
      // Mock mode: simulate Action compilation for 10 seconds
      console.log(`[GitHub Actions MOCK] Simulando ejecución de Action para SHA ${sha.substring(0, 7)}...`);
      setTimeout(() => {
        resolve({ conclusion: 'success', status: 'completed' });
      }, 10000);
      return;
    }

    const pollInterval = token ? 5000 : 15000;
    const start = Date.now();

    const check = () => {
      // 10 minutes timeout
      if (Date.now() - start > 600000) {
        return resolve({ conclusion: 'timeout', status: 'completed' });
      }

      const options = buildGitHubActionsRequest(sha, token);

      const req = https.get(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode !== 200) {
            // API Rate limit or temporary error, retry
            setTimeout(check, pollInterval);
            return;
          }
          try {
            const body = JSON.parse(data);
            const runs = body.workflow_runs;
            if (runs && runs.length > 0) {
              const run = runs[0];
              if (run.status === 'completed') {
                resolve({ conclusion: run.conclusion, status: run.status });
              } else {
                setTimeout(check, pollInterval);
              }
            } else {
              // Wait for GitHub to register the push commit run
              setTimeout(check, pollInterval);
            }
          } catch (e) {
            setTimeout(check, pollInterval);
          }
        });
      });

      req.on('error', () => {
        setTimeout(check, pollInterval);
      });
      req.end();
    };

    check();
  });
}

/**
 * Performs a secure HTTP/HTTPS fetch for V3 validation, evading cache.
 * @param {string} targetUrl 
 * @returns {Promise<{status: number, body: string}>}
 */
function secureFetchV3(targetUrl) {
  return new Promise((resolve, reject) => {
    // Add cache buster query string parameter
    const urlWithCacheBuster = new URL(targetUrl);
    urlWithCacheBuster.searchParams.set('cb', Date.now().toString());

    const parsed = urlWithCacheBuster;
    const hostname = parsed.hostname;
    const port = parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80);

    const maxDownloadSize = 100 * 1024;
    const isTestLocal = process.env.NODE_ENV === 'test' && (hostname === '127.0.0.1' || hostname === 'localhost');

    const proceed = (ip) => {
      const isHttps = parsed.protocol === 'https:';
      const options = {
        hostname: ip,
        port: port,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: {
          'Host': hostname,
          'User-Agent': 'AgendaFest-V3-Validator/1.0.0',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        rejectUnauthorized: true
      };

      const client = isHttps ? https : http;
      let isFinished = false;

      const done = (err, result) => {
        if (isFinished) return;
        isFinished = true;
        if (err) reject(err);
        else resolve(result);
      };

      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
          if (data.length > maxDownloadSize) {
            req.destroy();
            done(new Error('Respuesta de validación V3 supera el tamaño máximo.'));
          }
        });
        res.on('end', () => {
          done(null, { status: res.statusCode, body: data });
        });
      });

      req.on('error', (err) => done(new Error('Error de conexión: ' + err.message)));
      req.setTimeout(10000, () => {
        req.destroy();
        done(new Error('Timeout de validación (10s).'));
      });
      req.end();
    };

    if (isTestLocal) {
      proceed('127.0.0.1');
    } else {
      resolveAndValidateIp(hostname, port)
        .then((pinnedIp) => proceed(pinnedIp))
        .catch(reject);
    }
  });
}

/**
 * Runs the V3 validation checks against the deployed festival URL.
 * @param {string} baseUrl Official website URL of the festival.
 * @param {string} edicionId Expected edition ID.
 * @returns {Promise<object>} Results of the checklist validation.
 */
async function runV3Validation(baseUrl, edicionId) {
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  
  const results = {
    webStatus: { passed: false, message: 'No comprobado' },
    manifest: { passed: false, message: 'No comprobado' },
    serviceWorker: { passed: false, message: 'No comprobado' },
    editionCheck: { passed: false, message: 'No comprobado' }
  };

  // 1. Check HTTP 200 on Main Page
  try {
    const mainPage = await secureFetchV3(cleanBase);
    if (mainPage.status === 200) {
      results.webStatus = { passed: true, message: 'El sitio web oficial responde con HTTP 200.' };
      
      if (mainPage.body.includes(edicionId)) {
        results.editionCheck = { passed: true, message: `Edición "${edicionId}" encontrada en el HTML principal.` };
      } else {
        const scriptMatch = mainPage.body.match(/\/assets\/index-[a-zA-Z0-9_-]+\.js/);
        if (scriptMatch) {
          const scriptUrl = cleanBase + scriptMatch[0].replace(/^\//, '');
          try {
            const scriptFile = await secureFetchV3(scriptUrl);
            if (scriptFile.body.includes(edicionId)) {
              results.editionCheck = { passed: true, message: `Edición "${edicionId}" detectada dentro del bundle de scripts de Vite (${scriptMatch[0]}).` };
            } else {
              results.editionCheck = { passed: false, message: `La edición "${edicionId}" no fue encontrada en los bundles de scripts.` };
            }
          } catch (e) {
            results.editionCheck = { passed: false, message: `Fallo al verificar bundle de scripts: ${e.message}` };
          }
        } else {
          results.editionCheck = { passed: false, message: `No se encontró el script compilado de Vite en el HTML.` };
        }
      }
    } else {
      results.webStatus = { passed: false, message: `El portal principal retornó HTTP ${mainPage.status}.` };
    }
  } catch (err) {
    results.webStatus = { passed: false, message: `Fallo de conexión al portal: ${err.message}` };
    results.editionCheck = { passed: false, message: 'Depende de la conexión al portal principal.' };
  }

  // 2. Check manifest.json
  try {
    const manifestUrl = cleanBase + 'manifest.json';
    const manifest = await secureFetchV3(manifestUrl);
    if (manifest.status === 200) {
      const parsed = JSON.parse(manifest.body);
      if (parsed.short_name || parsed.name) {
        results.manifest = { passed: true, message: 'Archivo manifest.json de la PWA recuperado y estructurado correctamente.' };
      } else {
        results.manifest = { passed: false, message: 'manifest.json recuperado pero carece de campos válidos de PWA.' };
      }
    } else {
      results.manifest = { passed: false, message: `Fallo al descargar manifest.json: HTTP ${manifest.status}` };
    }
  } catch (err) {
    results.manifest = { passed: false, message: `manifest.json inaccesible: ${err.message}` };
  }

  // 3. Check sw.js (Service Worker Cache)
  try {
    const swUrl = cleanBase + 'sw.js';
    const sw = await secureFetchV3(swUrl);
    if (sw.status === 200) {
      if (sw.body.includes('self.addEventListener') || sw.body.includes('install')) {
        results.serviceWorker = { passed: true, message: 'Service Worker de la PWA detectado y funcionando correctamente.' };
      } else {
        results.serviceWorker = { passed: false, message: 'sw.js recuperado pero no parece ser un service worker válido.' };
      }
    } else {
      results.serviceWorker = { passed: false, message: `Fallo al descargar sw.js: HTTP ${sw.status}` };
    }
  } catch (err) {
    results.serviceWorker = { passed: false, message: `sw.js inaccesible: ${err.message}` };
  }

  return results;
}

module.exports = {
  FIXED_PUBLICATION_FILES,
  isAuthorizedPublicationFile,
  buildImportPublicationFiles,
  selectImportPublicationFiles,
  buildGitHubActionsRequest,
  parseGitStatus,
  validateGitStatus,
  runLocalBuild,
  runGitDeploy,
  pollGitHubAction,
  runV3Validation
};
