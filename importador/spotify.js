const https = require('https');

// Cache access token in memory
let cachedAccessToken = null;
let tokenExpiresAt = 0;

/**
 * Retrieves Spotify access token using Client Credentials Flow.
 * @returns {Promise<string>}
 */
function getSpotifyAccessToken() {
  return new Promise((resolve, reject) => {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return reject(new Error('Faltan credenciales de Spotify en .env'));
    }

    // Check if token is still valid (with 60s buffer)
    if (cachedAccessToken && Date.now() < tokenExpiresAt - 60000) {
      return resolve(cachedAccessToken);
    }

    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const postData = 'grant_type=client_credentials';

    const options = {
      hostname: 'accounts.spotify.com',
      port: 443,
      path: '/api/token',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Fallo de autenticación Spotify (HTTP ${res.statusCode}): ${data}`));
        }

        try {
          const body = JSON.parse(data);
          cachedAccessToken = body.access_token;
          tokenExpiresAt = Date.now() + (body.expires_in * 1000);
          resolve(cachedAccessToken);
        } catch (e) {
          reject(new Error('Respuesta de token Spotify inválida: ' + e.message));
        }
      });
    });

    req.on('error', (err) => reject(new Error('Error de conexión cuentas Spotify: ' + err.message)));
    req.write(postData);
    req.end();
  });
}

/**
 * Searches for an artist on Spotify. Falls back to mock if no keys are configured.
 * @param {string} artistName
 * @returns {Promise<object|null>} Artist metadata or null.
 */
function searchSpotifyArtist(artistName) {
  return new Promise((resolve) => {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const provider = process.env.AI_PROVIDER || 'mock';

    const cleanName = artistName.trim();

    if (provider === 'mock' || !clientId || !clientSecret) {
      // Deterministic Mock Database for typical bands
      const lower = cleanName.toLowerCase();
      
      if (lower === 'annisokay') {
        return resolve({
          spotifyId: '7lAi1Cv19DsukgGjbZQxFg',
          name: 'Annisokay',
          popularity: 58,
          genres: ['post-hardcore', 'metalcore', 'german metalcore'],
          url: 'https://open.spotify.com/artist/7lAi1Cv19DsukgGjbZQxFg'
        });
      }
      
      if (lower === 'gojira') {
        return resolve({
          spotifyId: '0PFtn5NtBbbUN6S5H1bwTu',
          name: 'Gojira',
          popularity: 69,
          genres: ['french metal', 'progressive metal', 'french death metal'],
          url: 'https://open.spotify.com/artist/0PFtn5NtBbbUN6S5H1bwTu'
        });
      }

      if (lower === 'rise against') {
        return resolve({
          spotifyId: '6ue0W5wPr4pmKVbgui45bp',
          name: 'Rise Against',
          popularity: 71,
          genres: ['punk', 'melodic hardcore', 'modern rock'],
          url: 'https://open.spotify.com/artist/6ue0W5wPr4pmKVbgui45bp'
        });
      }

      // Fallback deterministic mock ID based on simple hash
      let hash = 0;
      for (let i = 0; i < lower.length; i++) {
        hash = lower.charCodeAt(i) + ((hash << 5) - hash);
      }
      const hexHash = Math.abs(hash).toString(16).padEnd(22, 'x').substring(0, 22);

      return resolve({
        spotifyId: hexHash,
        name: cleanName,
        popularity: Math.floor(Math.random() * 40) + 15,
        genres: ['rock', 'alternative'],
        url: `https://open.spotify.com/artist/${hexHash}`
      });
    }

    // Call real Spotify API
    getSpotifyAccessToken()
      .then((token) => {
        const path = `/v1/search?q=${encodeURIComponent(cleanName)}&type=artist&limit=5`;
        const options = {
          hostname: 'api.spotify.com',
          port: 443,
          path: path,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'AgendaFest-Importador-Spotify/1.0.0'
          },
          timeout: 10000
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            if (res.statusCode !== 200) {
              // Return null on API failures to not break the scraper flow
              return resolve(null);
            }

            try {
              const body = JSON.parse(data);
              const items = body.artists.items;
              if (!items || items.length === 0) {
                return resolve(null);
              }

              // Return matches list or the best candidate (highest popularity)
              // Sort items by popularity descending
              items.sort((a, b) => b.popularity - a.popularity);
              
              const bestMatch = items[0];
              resolve({
                spotifyId: bestMatch.id,
                name: bestMatch.name,
                popularity: bestMatch.popularity,
                genres: bestMatch.genres,
                url: bestMatch.external_urls.spotify
              });
            } catch (e) {
              resolve(null);
            }
          });
        });

        req.on('error', () => resolve(null));
        req.end();
      })
      .catch(() => {
        resolve(null); // Resolve to null so scraper can keep going on auth failure
      });
  });
}

module.exports = {
  searchSpotifyArtist
};
