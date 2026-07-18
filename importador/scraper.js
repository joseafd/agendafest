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
    tablesText: '',
    pages: []
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
  const timetableImages = new Set();
  const relevantLinks = new Set();
  const timetableLinks = new Set();
  const scheduleKeywords = /(timetable|schedule|line[ -]?up|program(?:me)?|running[ -]?order|horario|cartel)/i;
  const timetableKeywords = /(timetable|schedule|program(?:me)?|running[ -]?order|horario)/i;
  const rootOrigin = new URL(url).origin;

  $('a').each((_, elem) => {
    const href = $(elem).attr('href');
    if (href) {
      try {
        const absoluteUrl = new URL(href, url).toString();
        if (absoluteUrl.toLowerCase().endsWith('.pdf') || absoluteUrl.toLowerCase().includes('horarios.pdf')) {
          discoveredPdfs.add(absoluteUrl);
        }
        const linkText = `${$(elem).text()} ${href} ${$(elem).attr('title') || ''}`;
        if (new URL(absoluteUrl).origin === rootOrigin && scheduleKeywords.test(linkText)) {
          relevantLinks.add(absoluteUrl.split('#')[0]);
          if (timetableKeywords.test(linkText)) timetableLinks.add(absoluteUrl.split('#')[0]);
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

  result.pages.push({
    url,
    title: $('title').text().trim(),
    text: $('body').text().replace(/\s+/g, ' ').trim().slice(0, 250000)
  });

  // Follow a small, same-origin allowlist of pages whose links explicitly look
  // related to the programme. This keeps crawling bounded and SSRF-protected.
  const prioritizedLinks = [
    ...timetableLinks,
    ...Array.from(relevantLinks).filter(linkedUrl => !timetableLinks.has(linkedUrl))
  ];
  for (const linkedUrl of prioritizedLinks.slice(0, 8)) {
    if (linkedUrl === url) continue;
    try {
      const linkedDownload = await secureDownload(linkedUrl, 750 * 1024);
      const linkedHtml = linkedDownload.body.toString('utf8');
      const linked$ = cheerio.load(linkedHtml);
      result.pages.push({
        url: linkedUrl,
        title: linked$('title').text().trim(),
        text: linked$('body').text().replace(/\s+/g, ' ').trim().slice(0, 250000)
      });

      linked$('a').each((_, elem) => {
        const href = linked$(elem).attr('href');
        if (!href) return;
        try {
          const absoluteUrl = new URL(href, linkedUrl).toString();
          if (/\.pdf(?:$|[?#])/i.test(absoluteUrl)) discoveredPdfs.add(absoluteUrl);
        } catch (e) {}
      });

      linked$('img').each((_, elem) => {
        const src = linked$(elem).attr('src') || linked$(elem).attr('data-src');
        if (!src) return;
        try {
          const absoluteUrl = new URL(src, linkedUrl).toString();
          const descriptor = `${absoluteUrl} ${linked$(elem).attr('alt') || ''}`;
          // On a timetable article, prefer day/timetable images and avoid logos,
          // icons, adverts and unrelated article thumbnails.
          if (scheduleKeywords.test(descriptor) || /(?:^|[-_/])day[-_ ]?\d/i.test(descriptor)) {
            discoveredImages.add(absoluteUrl);
            timetableImages.add(absoluteUrl);
          }
        } catch (e) {}
      });
    } catch (err) {
      result.pages.push({ url: linkedUrl, error: err.message });
    }
  }

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

  // 6. Download relevant images so Gemini receives their actual pixels, not
  // just URLs. Keep the aggregate request below the API inline payload limit.
  let imageBytes = 0;
  const prioritizedImages = [
    ...timetableImages,
    ...Array.from(discoveredImages).filter(imageUrl => !timetableImages.has(imageUrl))
  ];
  for (const imageUrl of prioritizedImages.slice(0, 12)) {
    try {
      const imageDownload = await secureDownload(imageUrl, 8 * 1024 * 1024);
      if (!/^image\/(jpeg|png|webp)/i.test(imageDownload.contentType)) {
        result.images.push({ url: imageUrl, error: 'El recurso no devolvió una imagen compatible.' });
        continue;
      }
      // Base64 expands binary data by ~33%; 13MB leaves room below Gemini's
      // 20MB inline request ceiling for the JSON and extracted page text.
      if (imageBytes + imageDownload.body.length > 13 * 1024 * 1024) break;
      imageBytes += imageDownload.body.length;
      result.images.push({
        url: imageUrl,
        mimeType: imageDownload.contentType.split(';')[0].toLowerCase(),
        data: imageDownload.body.toString('base64')
      });
    } catch (err) {
      result.images.push({ url: imageUrl, error: err.message });
    }
  }

  return result;
}

module.exports = {
  secureDownload,
  scrapeFestival
};
