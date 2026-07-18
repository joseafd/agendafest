const cheerio = require('cheerio');
const pdf = require('pdf-parse');
const http = require('http');
const https = require('https');
const { validateUrl, resolveAndValidateIp } = require('./security');

/**
 * Downloads a resource securely checking SSRF, timeouts, and size limits.
 * @param {string} targetUrl URL to download.
 * @param {number} maxSize Maximum allowed size in bytes.
 * @param {number} redirectCount Current redirect count.
 * @returns {Promise<{body: Buffer, contentType: string, statusCode: number}>}
 */
function secureDownload(targetUrl, maxSize = 50 * 1024, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 3) {
      return reject(new Error('Demasiadas redirecciones (máx 3).'));
    }

    try {
      validateUrl(targetUrl);
    } catch (err) {
      return reject(err);
    }

    const parsed = new URL(targetUrl);
    const hostname = parsed.hostname;
    const port = parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80);

    resolveAndValidateIp(hostname, port)
      .then((pinnedIp) => {
        const isHttps = parsed.protocol === 'https:';
        const options = {
          hostname: pinnedIp,
          port: port,
          path: parsed.pathname + parsed.search,
          method: 'GET',
          headers: {
            'Host': hostname,
            'User-Agent': 'AgendaFest-Importador-Scraper/1.0.0'
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

        const clientReq = client.request(options, (clientRes) => {
          const statusCode = clientRes.statusCode;

          // Handle redirection
          if (statusCode >= 300 && statusCode < 400 && clientRes.headers.location) {
            const redirectUrl = new URL(clientRes.headers.location, targetUrl).toString();
            clientReq.destroy();
            return secureDownload(redirectUrl, maxSize, redirectCount + 1).then(resolve).catch(reject);
          }

          const contentType = clientRes.headers['content-type'] || '';
          const chunks = [];
          let downloadedSize = 0;

          clientRes.on('data', (chunk) => {
            chunks.push(chunk);
            downloadedSize += chunk.length;
            if (downloadedSize > maxSize) {
              clientReq.destroy();
              done(new Error(`Tamaño máximo de descarga superado para el recurso (${Math.round(maxSize / 1024)}KB).`));
            }
          });

          clientRes.on('end', () => {
            const buffer = Buffer.concat(chunks);
            done(null, {
              body: buffer,
              contentType: contentType,
              statusCode: statusCode
            });
          });
        });

        clientReq.on('error', (err) => {
          done(new Error('Error de conexión: ' + err.message));
        });

        // Timeout 30 seconds
        clientReq.setTimeout(30000, () => {
          clientReq.destroy();
          done(new Error('Timeout de conexión (30s).'));
        });

        clientReq.end();
      })
      .catch((err) => {
        reject(new Error('SSRF / DNS Rebinding bloqueado: ' + err.message));
      });
  });
}

/**
 * Scrapes a festival page, classifies sources, and extracts content.
 * @param {string} url The festival website URL.
 * @returns {Promise<object>} Discovered data structure.
 */
async function scrapeFestival(url) {
  const result = {
    url: url,
    htmlContent: '',
    jsonLd: [],
    pdfs: [],
    images: [],
    tablesText: ''
  };

  // 1. Download HTML page (500KB limit for HTML text to allow large pages but block massive ones)
  const download = await secureDownload(url, 500 * 1024);
  const html = download.body.toString('utf8');
  result.htmlContent = html;

  const $ = cheerio.load(html);

  // 2. Extract JSON-LD (Fase A/B: API/Internal data metadata)
  $('script[type="application/ld+json"]').each((_, elem) => {
    try {
      const parsedJson = JSON.parse($(elem).html());
      result.jsonLd.push(parsedJson);
    } catch (e) {
      // Ignore malformed JSON-LD
    }
  });

  // 3. Find tables and structured divs (Fase C.2: HTML simple tables text)
  const tables = [];
  $('table').each((_, elem) => {
    tables.push($(elem).text().replace(/\s+/g, ' ').trim());
  });
  
  // Look for timetable classes or schedules
  const scheduleDivs = [];
  $('div[class*="schedule"], div[class*="timetable"], div[id*="schedule"], div[id*="timetable"]').each((_, elem) => {
    scheduleDivs.push($(elem).text().replace(/\s+/g, ' ').trim());
  });

  result.tablesText = [
    tables.join('\n---\n'),
    scheduleDivs.join('\n---\n')
  ].filter(Boolean).join('\n\n');

  // 4. Discover PDFs and Images (Fase A)
  const discoveredPdfs = new Set();
  const discoveredImages = new Set();

  $('a').each((_, elem) => {
    const href = $(elem).attr('href');
    if (href) {
      try {
        const absoluteUrl = new URL(href, url).toString();
        if (absoluteUrl.toLowerCase().endsWith('.pdf') || absoluteUrl.toLowerCase().includes('horarios.pdf')) {
          discoveredPdfs.add(absoluteUrl);
        }
      } catch (e) {}
    }
  });

  $('img').each((_, elem) => {
    const src = $(elem).attr('src');
    if (src) {
      try {
        const absoluteUrl = new URL(src, url).toString();
        const lowerUrl = absoluteUrl.toLowerCase();
        if (lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || lowerUrl.endsWith('.png') || lowerUrl.endsWith('.webp')) {
          discoveredImages.add(absoluteUrl);
        }
      } catch (e) {}
    }
  });

  // 5. Download and parse PDFs if discovered (Fase C.3: PDF extraction up to 15MB)
  for (const pdfUrl of discoveredPdfs) {
    try {
      // 15MB limit
      const pdfDownload = await secureDownload(pdfUrl, 15 * 1024 * 1024);
      const pdfData = await pdf(pdfDownload.body);
      result.pdfs.push({
        url: pdfUrl,
        text: pdfData.text
      });
    } catch (err) {
      // Fail gracefully on individual PDF errors, just log them
      result.pdfs.push({
        url: pdfUrl,
        error: err.message
      });
    }
  }

  // 6. Record discovered image URLs (Fase C.4: images to be processed visually by Gemini)
  result.images = Array.from(discoveredImages).map(imageUrl => ({ url: imageUrl }));

  return result;
}

module.exports = {
  secureDownload,
  scrapeFestival
};
