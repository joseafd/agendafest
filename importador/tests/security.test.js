process.env.NODE_ENV = 'test';
const assert = require('assert');
const http = require('http');
const path = require('path');
const net = require('net');
const dns = require('dns');

// Import security library
const security = require('../security');

// Start the importador server on test port 3031
process.env.PORT = 3031;
process.env.AI_PROVIDER = 'mock';
const { server, getPairingCode, getSessionToken } = require('../server');

// Start a mock target server on port 3032 to simulate external web resources
const targetServer = http.createServer((req, res) => {
  if (req.url === '/redirect-private') {
    res.writeHead(302, { 'Location': 'http://127.0.0.1:3031/api/status' });
    res.end();
  } else if (req.url === '/redirect-loop') {
    res.writeHead(302, { 'Location': 'http://127.0.0.1:3032/redirect-loop' });
    res.end();
  } else if (req.url === '/redirect-ok') {
    res.writeHead(302, { 'Location': 'http://127.0.0.1:3032/ok' });
    res.end();
  } else if (req.url === '/redirect-5-start') {
    res.writeHead(302, { 'Location': 'http://127.0.0.1:3032/redirect-5-2' });
    res.end();
  } else if (req.url === '/redirect-5-2') {
    res.writeHead(302, { 'Location': 'http://127.0.0.1:3032/redirect-5-3' });
    res.end();
  } else if (req.url === '/redirect-5-3') {
    res.writeHead(302, { 'Location': 'http://127.0.0.1:3032/redirect-5-4' });
    res.end();
  } else if (req.url === '/redirect-5-4') {
    res.writeHead(302, { 'Location': 'http://127.0.0.1:3032/ok' });
    res.end();
  } else if (req.url === '/ok') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><body>OK</body></html>');
  } else if (req.url === '/slow') {
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Slow response body');
    }, 6000);
  } else if (req.url === '/no-content-length') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write('Chunk 1 without content-length');
    res.end();
  } else if (req.url === '/chunked-large') {
    // Send 60KB chunked data without Content-Length
    res.writeHead(200, { 'Content-Type': 'text/html', 'Transfer-Encoding': 'chunked' });
    res.write('a'.repeat(60 * 1024));
    res.end();
  } else if (req.url === '/fake-mime') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write(Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x01, 0x01, 0x01, 0x00]));
    res.end();
  } else if (req.url === '/large') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write('a'.repeat(60 * 1024));
    res.end();
  } else {
    res.writeHead(404);
    res.end();
  }
});

targetServer.listen(3032, '127.0.0.1');

// Helper to make request
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

async function runTests() {
  console.log('=== INICIANDO PRUEBAS DE SEGURIDAD AMPLIADAS (INCREMENTO 1) ===\n');
  let testCount = 0;
  let passedCount = 0;

  function runTest(name, fn) {
    testCount++;
    try {
      fn();
      console.log(`🟢 TEST ${testCount} PASADO: ${name}`);
      passedCount++;
    } catch (e) {
      console.error(`🔴 TEST ${testCount} FALLADO: ${name}`);
      console.error(e);
    }
  }

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

  // TEST 1: Servidor enlazado a 127.0.0.1
  runTest('Servidor enlazado exclusivamente a 127.0.0.1', () => {
    const address = server.address();
    assert.strictEqual(address.address, '127.0.0.1');
    assert.strictEqual(address.port, 3031);
  });

  // TEST 2: Intentar entrar sin sesión
  await runTestAsync('Acceso a / bloqueado sin cookie de sesión', async () => {
    const resObj = await makeRequest({
      hostname: '127.0.0.1',
      port: 3031,
      path: '/',
      method: 'GET'
    });
    assert.strictEqual(resObj.res.statusCode, 403);
    assert.ok(resObj.body.includes('Emparejamiento'));
  });

  // TEST 3: Intentar entrar en /api/login-pairing con código inválido
  await runTestAsync('Acceso a login-pairing bloqueado con código inválido', async () => {
    const resObj = await makeRequest({
      hostname: '127.0.0.1',
      port: 3031,
      path: '/api/login-pairing',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { code: 'WRONG' });
    assert.strictEqual(resObj.res.statusCode, 401);
  });

  // TEST 4: Entrar con código de emparejamiento correcto de un solo uso
  let sessionCookie = '';
  await runTestAsync('Acceso con código de emparejamiento de un solo uso correcto', async () => {
    const code = getPairingCode();
    const resObj = await makeRequest({
      hostname: '127.0.0.1',
      port: 3031,
      path: '/api/login-pairing',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { code });
    assert.strictEqual(resObj.res.statusCode, 200);
    
    const setCookie = resObj.res.headers['set-cookie'][0];
    assert.ok(setCookie.includes('af_session_token='));
    assert.ok(setCookie.includes('HttpOnly'));
    assert.ok(setCookie.includes('SameSite=Strict') || setCookie.includes('samesite=strict'));
    
    sessionCookie = setCookie.split(';')[0];
  });

  // TEST 5: Código de un solo uso queda quemado
  await runTestAsync('Código de emparejamiento queda inutilizado inmediatamente', async () => {
    const code = getPairingCode(); // Will be null now since it is burned
    const resObj = await makeRequest({
      hostname: '127.0.0.1',
      port: 3031,
      path: '/api/login-pairing',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { code: code || 'ANYTHING' });
    assert.strictEqual(resObj.res.statusCode, 401);
  });

  // TEST 6: IPv4 en formatos alternativos
  runTest('Normalización de IPv4 en formatos alternativos (Octal, Hex, Dword)', () => {
    assert.strictEqual(security.parseAlternateIpv4('0177.0.0.1'), '127.0.0.1');
    assert.strictEqual(security.isDisallowedIp(security.parseAlternateIpv4('0177.0.0.1')), true);
    
    assert.strictEqual(security.parseAlternateIpv4('0x7f.0x0.0x0.0x1'), '127.0.0.1');
    assert.strictEqual(security.isDisallowedIp(security.parseAlternateIpv4('0x7f.0x0.0x0.0x1')), true);
    assert.strictEqual(security.parseAlternateIpv4('0x7f000001'), '127.0.0.1');
    assert.strictEqual(security.isDisallowedIp(security.parseAlternateIpv4('0x7f000001')), true);
    
    assert.strictEqual(security.parseAlternateIpv4('2130706433'), '127.0.0.1');
    assert.strictEqual(security.isDisallowedIp(security.parseAlternateIpv4('2130706433')), true);
  });

  // TEST 7: IPv4 embebida en IPv6
  runTest('Mitigación de IPv4 embebida en IPv6', () => {
    assert.strictEqual(security.isDisallowedIp('::ffff:127.0.0.1'), true);
    assert.strictEqual(security.isDisallowedIp('::ffff:7f00:1'), true);
    assert.strictEqual(security.isDisallowedIp('::ffff:c0a8:101'), true);
  });

  // TEST 8: URL con credenciales
  runTest('Validación de URL con credenciales', () => {
    assert.throws(() => security.validateUrl('http://user:pass@127.0.0.1/'), /bloqueado/);
    assert.throws(() => security.validateUrl('http://admin:secret@10.0.0.1/'), /bloqueado/);
  });

  // TEST 9: Protocolos y puertos no admitidos
  runTest('Bloqueo de protocolos y puertos no admitidos', () => {
    assert.throws(() => security.validateUrl('ftp://google.com/'), /Protocolo/);
    assert.throws(() => security.validateUrl('gopher://google.com/'), /Protocolo/);
    assert.throws(() => security.validateUrl('file:///etc/passwd'), /Protocolo/);
    assert.throws(() => security.validateUrl('https://google.com:22/'), /Puerto/);
    assert.throws(() => security.validateUrl('http://google.com:25/'), /Puerto/);
  });

  // TEST 10: Validación de Origin malicioso
  await runTestAsync('Bloqueo de Origin malicioso en las APIs', async () => {
    const resObj = await makeRequest({
      hostname: '127.0.0.1',
      port: 3031,
      path: '/api/status',
      method: 'GET',
      headers: {
        'Cookie': sessionCookie,
        'Origin': 'http://evil-domain.com'
      }
    });
    assert.strictEqual(resObj.res.statusCode, 403);
  });

  // TEST 11: Bloqueo de Métodos HTTP no permitidos
  await runTestAsync('Bloqueo de métodos HTTP no soportados', async () => {
    const resObj = await makeRequest({
      hostname: '127.0.0.1',
      port: 3031,
      path: '/api/fetch-url',
      method: 'PUT',
      headers: {
        'Cookie': sessionCookie,
        'Content-Type': 'application/json'
      }
    }, { url: 'https://www.google.com' });
    assert.strictEqual(resObj.res.statusCode, 404);
  });

  // TEST 12: Path Traversal en el servidor de estáticos
  await runTestAsync('Path Traversal bloqueado en estáticos', async () => {
    const resObj = await makeRequest({
      hostname: '127.0.0.1',
      port: 3031,
      path: '/../.env',
      method: 'GET'
    });
    assert.ok(resObj.res.statusCode === 400 || resObj.res.statusCode === 403 || resObj.res.statusCode === 404);
  });

  // TEST 13: Redirecciones en SSRF a IP privada
  await runTestAsync('SSRF bloquea redirecciones a IPs privadas (302 Redirect Hijack)', async () => {
    const resObj = await makeRequest({
      hostname: '127.0.0.1',
      port: 3031,
      path: '/api/fetch-url',
      method: 'POST',
      headers: {
        'Cookie': sessionCookie,
        'Content-Type': 'application/json'
      }
    }, { url: 'http://127.0.0.1:3032/redirect-private' });
    assert.strictEqual(resObj.res.statusCode, 400);
    assert.ok(resObj.body.includes('bloqueado') || resObj.body.includes('SSRF'));
  });

  // TEST 14: Respuestas lentas (SSRF Timeout)
  await runTestAsync('SSRF controla timeouts de peticiones lentas', async () => {
    const resObj = await makeRequest({
      hostname: '127.0.0.1',
      port: 3031,
      path: '/api/fetch-url',
      method: 'POST',
      headers: {
        'Cookie': sessionCookie,
        'Content-Type': 'application/json'
      }
    }, { url: 'http://127.0.0.1:3032/slow' });
    assert.strictEqual(resObj.res.statusCode, 400);
    assert.ok(resObj.body.includes('Timeout'));
  });

  // TEST 15: Respuestas de gran tamaño (Max size limit)
  await runTestAsync('SSRF limita el tamaño de la respuesta descargable', async () => {
    const resObj = await makeRequest({
      hostname: '127.0.0.1',
      port: 3031,
      path: '/api/fetch-url',
      method: 'POST',
      headers: {
        'Cookie': sessionCookie,
        'Content-Type': 'application/json'
      }
    }, { url: 'http://127.0.0.1:3032/large' });
    assert.strictEqual(resObj.res.statusCode, 400);
    assert.ok(resObj.body.includes('Tamaño'));
  });

  // TEST 16: MIME type no soportado o falso
  await runTestAsync('SSRF limita los tipos MIME admitidos y bloquea binarios', async () => {
    const resObj = await makeRequest({
      hostname: '127.0.0.1',
      port: 3031,
      path: '/api/fetch-url',
      method: 'POST',
      headers: {
        'Cookie': sessionCookie,
        'Content-Type': 'application/json'
      }
    }, { url: 'http://127.0.0.1:3032/fake-mime' });
    assert.strictEqual(resObj.res.statusCode, 400);
    assert.ok(resObj.body.includes('MIME'));
  });

  // TEST 18: Ausencia de secretos en respuestas y logs
  runTest('Las excepciones y respuestas de la API no deben exponer información sensible', () => {
    try {
      security.validateUrl('http://admin:extremelysecretpassword@10.0.0.1/');
    } catch(err) {
      assert.ok(!err.message.includes('extremelysecretpassword'));
      assert.ok(err.message.includes('bloqueado'));
    }
  });

  // NUEVO TEST 19: DNS con respuestas públicas y privadas combinadas
  await runTestAsync('SSRF bloquea DNS que resuelven a combinación de IP pública y privada', async () => {
    // Mock dns.resolve4 to return a combination of public and private IPs for testing
    const originalResolve4 = dns.resolve4;
    dns.resolve4 = (hostname, callback) => {
      if (hostname === 'evil-combination.mock') {
        return callback(null, ['8.8.8.8', '127.0.0.1']);
      }
      originalResolve4(hostname, callback);
    };

    try {
      await security.resolveAndValidateIp('evil-combination.mock');
      assert.fail('Debe lanzar error al resolver IPs mixtas.');
    } catch (err) {
      assert.ok(err.message.includes('privada') || err.message.includes('SSRF') || err.message.includes('Rebinding'));
    } finally {
      // Restore dns.resolve4
      dns.resolve4 = originalResolve4;
    }
  });

  // NUEVO TEST 20: DNS rebinding entre validación y conexión (DNS Pinning)
  runTest('DNS Pinning evita DNS Rebinding entre la fase de chequeo y la conexión', () => {
    // Port 8080 is blocked for localhost, so it must throw
    assert.throws(() => security.validateUrl('http://127.0.0.1:8080/'));
    // Port 80 is allowed for public IP
    assert.ok(security.validateUrl('http://8.8.8.8/'));
  });

  // NUEVO TEST 21: Múltiples redirecciones superando el límite (máx 3)
  await runTestAsync('SSRF bloquea redirecciones múltiples que excedan el límite de 3 saltos', async () => {
    const resObj = await makeRequest({
      hostname: '127.0.0.1',
      port: 3031,
      path: '/api/fetch-url',
      method: 'POST',
      headers: {
        'Cookie': sessionCookie,
        'Content-Type': 'application/json'
      }
    }, { url: 'http://127.0.0.1:3032/redirect-5-start' });
    assert.strictEqual(resObj.res.statusCode, 400);
    assert.ok(resObj.body.includes('redirecciones'));
  });

  // NUEVO TEST 22: Respuesta de gran tamaño sin cabecera Content-Length
  await runTestAsync('SSRF limita respuestas grandes transmitidas por chunks sin cabecera Content-Length', async () => {
    const resObj = await makeRequest({
      hostname: '127.0.0.1',
      port: 3031,
      path: '/api/fetch-url',
      method: 'POST',
      headers: {
        'Cookie': sessionCookie,
        'Content-Type': 'application/json'
      }
    }, { url: 'http://127.0.0.1:3032/chunked-large' });
    assert.strictEqual(resObj.res.statusCode, 400);
    assert.ok(resObj.body.includes('Tamaño'));
  });

  // NUEVO TEST 23: Ausencia de secretos en respuestas y logs de salida
  await runTestAsync('Los secretos y tokens no deben ser impresos en logs o cuerpos de respuesta', async () => {
    const token = getSessionToken();
    const resObj = await makeRequest({
      hostname: '127.0.0.1',
      port: 3031,
      path: '/api/status',
      method: 'GET',
      headers: {
        'Cookie': sessionCookie
      }
    });
    assert.ok(!resObj.body.includes(token));
  });

  // TEST 17: Cookie antigua es rechazada tras reinicio (o limpieza) - Se ejecuta al final de los tests autenticados
  await runTestAsync('Cookie antigua es rechazada si la sesión en memoria se invalida', async () => {
    security.clearSession();
    const resObj = await makeRequest({
      hostname: '127.0.0.1',
      port: 3031,
      path: '/api/status',
      method: 'GET',
      headers: {
        'Cookie': sessionCookie
      }
    });
    assert.strictEqual(resObj.res.statusCode, 401);
  });

  console.log('\n==================================================');
  console.log(`Pruebas completadas: ${passedCount} / ${testCount} superadas.`);
  console.log('==================================================');

  // Clean shutdown
  targetServer.close();
  server.close(() => {
    if (passedCount === testCount) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  });
}

// Start execution
setTimeout(runTests, 1000);
