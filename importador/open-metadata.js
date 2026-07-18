const fs = require('fs');
const path = require('path');
const https = require('https');

const CACHE_FILE = path.join(__dirname, 'temp', 'open-metadata-cache.json');
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MUSICBRAINZ_INTERVAL_MS = 1100;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
let lastMusicBrainzRequestAt = 0;

function requestJson({ hostname, requestPath, method = 'GET', headers = {}, body = '' }) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname,
      port: 443,
      path: requestPath,
      method,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AgendaFest-Importador/1.0 (https://github.com/joseafd/agendafest)',
        ...headers
      },
      timeout: 15000
    }, (res) => {
      let data = '';
      let size = 0;
      res.on('data', chunk => {
        size += chunk.length;
        if (size > MAX_RESPONSE_BYTES) {
          req.destroy(new Error('La fuente de metadatos superó el tamaño permitido.'));
          return;
        }
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const error = new Error(`La fuente ${hostname} respondió HTTP ${res.statusCode}.`);
          error.statusCode = res.statusCode;
          return reject(error);
        }
        try {
          resolve(JSON.parse(data));
        } catch (_) {
          reject(new Error(`La fuente ${hostname} devolvió JSON inválido.`));
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error(`Timeout consultando ${hostname}.`)));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function loadCache() {
  try {
    const parsed = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    return {};
  }
}

function saveCache(cache) {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  const tempFile = `${CACHE_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(cache, null, 2), { mode: 0o600 });
  fs.renameSync(tempFile, CACHE_FILE);
}

function cacheKey(artist) {
  return artist.spotifyId ? `spotify:${artist.spotifyId}` : `name:${artist.artistName.trim().toLowerCase()}`;
}

function isFresh(entry) {
  return Boolean(entry && entry.updatedAt && Date.now() - entry.updatedAt < CACHE_TTL_MS);
}

function socialFieldsPresent(artist) {
  return Boolean(artist.instagramUrl || artist.facebookUrl || artist.xUrl || artist.tiktokUrl);
}

function applyMetadata(artist, metadata) {
  if (!metadata) return artist;
  const fields = ['instagramUrl', 'facebookUrl', 'xUrl', 'tiktokUrl', 'officialWebsite', 'youtubeUrl'];
  for (const field of fields) {
    if (!artist[field] && metadata[field]) artist[field] = metadata[field];
  }
  if (!artist.youtubeChannelId && metadata.youtubeChannelId) artist.youtubeChannelId = metadata.youtubeChannelId;
  if (!artist.socialSource && socialFieldsPresent(metadata)) artist.socialSource = metadata.socialSource || 'fuente abierta';
  if (!artist.youtubeSource && metadata.youtubeUrl) artist.youtubeSource = metadata.youtubeSource || 'YouTube';
  if (!artist.youtubeStatus && metadata.youtubeStatus) artist.youtubeStatus = metadata.youtubeStatus;
  return artist;
}

function buildWikidataQuery(spotifyIds) {
  const values = spotifyIds
    .filter(id => /^[A-Za-z0-9]{22}$/.test(id))
    .map(id => `"${id}"`)
    .join(' ');
  return `
    SELECT ?spotify
      (SAMPLE(?instagramValue) AS ?instagram)
      (SAMPLE(?facebookValue) AS ?facebook)
      (SAMPLE(?twitterValue) AS ?twitter)
      (SAMPLE(?tiktokValue) AS ?tiktok)
      (SAMPLE(?youtubeValue) AS ?youtube)
      (SAMPLE(?websiteValue) AS ?website)
    WHERE {
      VALUES ?spotify { ${values} }
      ?item wdt:P1902 ?spotify.
      OPTIONAL { ?item wdt:P2003 ?instagramValue. }
      OPTIONAL { ?item wdt:P2013 ?facebookValue. }
      OPTIONAL { ?item wdt:P2002 ?twitterValue. }
      OPTIONAL { ?item wdt:P7085 ?tiktokValue. }
      OPTIONAL { ?item wdt:P2397 ?youtubeValue. }
      OPTIONAL { ?item wdt:P856 ?websiteValue. }
    }
    GROUP BY ?spotify
  `;
}

function parseWikidataResponse(body) {
  const result = new Map();
  for (const row of body?.results?.bindings || []) {
    const spotifyId = row.spotify?.value;
    if (!spotifyId) continue;
    const instagram = row.instagram?.value || '';
    const facebook = row.facebook?.value || '';
    const twitter = row.twitter?.value || '';
    const tiktok = row.tiktok?.value || '';
    const youtubeChannelId = row.youtube?.value || '';
    result.set(spotifyId, {
      instagramUrl: instagram ? `https://www.instagram.com/${encodeURIComponent(instagram)}/` : '',
      facebookUrl: facebook ? `https://www.facebook.com/${encodeURIComponent(facebook)}` : '',
      xUrl: twitter ? `https://x.com/${encodeURIComponent(twitter)}` : '',
      tiktokUrl: tiktok ? `https://www.tiktok.com/@${encodeURIComponent(tiktok)}` : '',
      youtubeChannelId,
      officialWebsite: row.website?.value || '',
      socialSource: 'Wikidata'
    });
  }
  return result;
}

async function fetchWikidataMetadata(spotifyIds, client = requestJson) {
  const validIds = [...new Set(spotifyIds.filter(id => /^[A-Za-z0-9]{22}$/.test(id)))];
  if (validIds.length === 0) return new Map();
  const body = new URLSearchParams({ query: buildWikidataQuery(validIds), format: 'json' }).toString();
  const response = await client({
    hostname: 'query.wikidata.org',
    requestPath: '/sparql',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body)
    },
    body
  });
  return parseWikidataResponse(response);
}

function classifyRelationUrls(relations = []) {
  const metadata = { socialSource: 'MusicBrainz' };
  for (const relation of relations) {
    const resource = relation?.url?.resource;
    if (!resource) continue;
    let parsed;
    try { parsed = new URL(resource); } catch (_) { continue; }
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'instagram.com' && !metadata.instagramUrl) metadata.instagramUrl = resource;
    else if (host === 'facebook.com' && !metadata.facebookUrl) metadata.facebookUrl = resource;
    else if ((host === 'twitter.com' || host === 'x.com') && !metadata.xUrl) metadata.xUrl = resource;
    else if (host === 'tiktok.com' && !metadata.tiktokUrl) metadata.tiktokUrl = resource;
    else if ((host === 'youtube.com' || host === 'youtu.be') && !metadata.youtubeChannelUrl) {
      metadata.youtubeChannelUrl = resource;
      const channelMatch = parsed.pathname.match(/^\/channel\/(UC[A-Za-z0-9_-]+)$/);
      if (channelMatch) metadata.youtubeChannelId = channelMatch[1];
    }
    else if ((relation.type === 'official homepage' || relation.type === 'official site') && !metadata.officialWebsite) metadata.officialWebsite = resource;
  }
  return metadata;
}

function extractMusicBrainzArtistId(urlLookup) {
  for (const relation of urlLookup?.relations || []) {
    if (relation?.artist?.id) return relation.artist.id;
  }
  return '';
}

async function waitForMusicBrainz() {
  const remaining = MUSICBRAINZ_INTERVAL_MS - (Date.now() - lastMusicBrainzRequestAt);
  if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
  lastMusicBrainzRequestAt = Date.now();
}

async function fetchMusicBrainzMetadata(spotifyId, client = requestJson) {
  if (!/^[A-Za-z0-9]{22}$/.test(spotifyId)) return {};
  await waitForMusicBrainz();
  const spotifyUrl = `https://open.spotify.com/artist/${spotifyId}`;
  const urlLookup = await client({
    hostname: 'musicbrainz.org',
    requestPath: `/ws/2/url?resource=${encodeURIComponent(spotifyUrl)}&inc=artist-rels&fmt=json`
  });
  const artistId = extractMusicBrainzArtistId(urlLookup);
  if (!artistId) return {};
  await waitForMusicBrainz();
  const artist = await client({
    hostname: 'musicbrainz.org',
    requestPath: `/ws/2/artist/${encodeURIComponent(artistId)}?inc=url-rels&fmt=json`
  });
  return classifyRelationUrls(artist.relations);
}

function normalizeWords(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
}

function chooseYoutubeVideo(items, artistName) {
  const artistWords = normalizeWords(artistName);
  if (artistWords.length === 0) return null;
  const scored = (items || []).map(item => {
    const titleWords = normalizeWords(item?.snippet?.title);
    const channelWords = normalizeWords(item?.snippet?.channelTitle);
    const haystack = new Set([...titleWords, ...channelWords]);
    const matched = artistWords.filter(word => haystack.has(word)).length;
    const official = titleWords.includes('official') ? 2 : 0;
    const video = titleWords.includes('video') ? 1 : 0;
    return { item, score: (matched / artistWords.length) * 10 + official + video, matched };
  }).sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best || best.matched === 0 || best.score < 6) return null;
  const videoId = best.item?.id?.videoId;
  return videoId ? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}` : null;
}

async function fetchYoutubeVideo(artistName, apiKey, client = requestJson, channelId = '') {
  if (!apiKey) return { status: 'not_configured', youtubeUrl: '' };
  const params = new URLSearchParams({
    part: 'snippet',
    q: `"${artistName}" official music video`,
    type: 'video',
    maxResults: '5',
    videoEmbeddable: 'true',
    key: apiKey
  });
  if (/^UC[A-Za-z0-9_-]+$/.test(channelId)) params.set('channelId', channelId);
  const body = await client({ hostname: 'www.googleapis.com', requestPath: `/youtube/v3/search?${params}` });
  const youtubeUrl = chooseYoutubeVideo(body.items, artistName) || '';
  return { status: youtubeUrl ? 'found' : 'not_found', youtubeUrl, youtubeSource: youtubeUrl ? 'YouTube Data API' : '' };
}

async function mapWithConcurrency(items, concurrency, worker) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index], index);
    }
  });
  await Promise.all(runners);
}

async function enrichArtistsWithOpenMetadata(lineup, options = {}) {
  const logger = options.logger || (() => {});
  const cache = options.cache || loadCache();
  const unique = new Map();
  for (const artist of lineup) unique.set(cacheKey(artist), artist);
  const artists = [...unique.values()];

  const freshKeys = new Set();
  for (const artist of artists) {
    const cached = cache[cacheKey(artist)];
    if (isFresh(cached)) {
      freshKeys.add(cacheKey(artist));
      applyMetadata(artist, cached);
    }
  }

  const refreshArtists = artists.filter(artist => !freshKeys.has(cacheKey(artist)));
  const spotifyIds = refreshArtists.filter(artist => artist.spotifyId).map(artist => artist.spotifyId);
  try {
    const wikidata = await (options.fetchWikidata || fetchWikidataMetadata)(spotifyIds);
    for (const artist of artists) applyMetadata(artist, wikidata.get(artist.spotifyId));
    logger(`Wikidata y caché completaron RRSS para ${artists.filter(socialFieldsPresent).length}/${artists.length} artistas.`);
  } catch (error) {
    logger(`Wikidata no estuvo disponible: ${error.message}`);
  }

  if (options.enableMusicBrainz !== false) {
    const musicBrainzPending = refreshArtists.filter(item => item.spotifyId && !socialFieldsPresent(item));
    if (musicBrainzPending.length > 0) {
      logger(`MusicBrainz buscará RRSS faltantes para ${musicBrainzPending.length} artistas respetando 1 petición/segundo.`);
    }
    for (const artist of musicBrainzPending) {
      try {
        const metadata = await (options.fetchMusicBrainz || fetchMusicBrainzMetadata)(artist.spotifyId);
        applyMetadata(artist, metadata);
      } catch (_) {
        // Una fuente auxiliar no debe bloquear la importación completa.
      }
    }
  }

  const youtubeApiKey = options.youtubeApiKey ?? process.env.YOUTUBE_API_KEY ?? '';
  const pendingVideos = artists.filter(artist => {
    if (artist.youtubeUrl) return false;
    if (!freshKeys.has(cacheKey(artist))) return true;
    return artist.youtubeStatus === 'not_configured' && Boolean(youtubeApiKey);
  });
  if (!youtubeApiKey && pendingVideos.length > 0) {
    logger('YouTube Data API no configurada: los vídeos seguirán pendientes hasta añadir YOUTUBE_API_KEY.');
  }
  await mapWithConcurrency(pendingVideos, 4, async artist => {
    try {
      const result = await (options.fetchYoutube || fetchYoutubeVideo)(artist.artistName, youtubeApiKey, requestJson, artist.youtubeChannelId || '');
      applyMetadata(artist, result);
      artist.youtubeStatus = result.status;
    } catch (_) {
      artist.youtubeStatus = 'api_error';
    }
  });

  for (const artist of artists) {
    cache[cacheKey(artist)] = {
      instagramUrl: artist.instagramUrl || '', facebookUrl: artist.facebookUrl || '',
      xUrl: artist.xUrl || '', tiktokUrl: artist.tiktokUrl || '',
      officialWebsite: artist.officialWebsite || '', youtubeUrl: artist.youtubeUrl || '',
      youtubeChannelId: artist.youtubeChannelId || '', socialSource: artist.socialSource || '',
      youtubeSource: artist.youtubeSource || '', youtubeStatus: artist.youtubeStatus || '',
      socialStatus: socialFieldsPresent(artist) ? 'found' : 'not_found', updatedAt: Date.now()
    };
  }
  if (!options.cache) {
    try {
      saveCache(cache);
    } catch (_) {
      logger('No se pudo actualizar la caché local; la importación continuará sin bloquearse.');
    }
  }

  const socialCount = artists.filter(socialFieldsPresent).length;
  const videoCount = artists.filter(artist => artist.youtubeUrl).length;
  logger(`Fuentes abiertas completaron RRSS para ${socialCount}/${artists.length} y vídeo para ${videoCount}/${artists.length}.`);

  const byKey = new Map(artists.map(artist => [cacheKey(artist), artist]));
  return lineup.map(item => ({ ...item, ...(byKey.get(cacheKey(item)) || {}) }));
}

module.exports = {
  enrichArtistsWithOpenMetadata,
  fetchWikidataMetadata,
  parseWikidataResponse,
  fetchMusicBrainzMetadata,
  classifyRelationUrls,
  extractMusicBrainzArtistId,
  fetchYoutubeVideo,
  chooseYoutubeVideo,
  buildWikidataQuery,
  applyMetadata,
  socialFieldsPresent
};
